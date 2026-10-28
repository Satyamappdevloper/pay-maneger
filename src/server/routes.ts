/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: RESTful API Route Controllers (Zero Paid Keys Required)
 * 100% Free Public APIs, Local Mock Auth, Browser Storage & WhatsApp Deep-Links
 */

import { Router, Request, Response } from 'express';
import { db } from './db.ts';
import { currencyService } from './currencyService.ts';
import { simplifyDebts, calculateNetBalances } from '../engines/debtSimplifier.ts';
import { Expense, Group, SettlementRecord, User } from '../models/types.ts';

export const apiRouter = Router();

// ---------------------------------------------------------------------------
// 0. HEALTH CHECK
// ---------------------------------------------------------------------------
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'Pay Manager Backend Engine',
    version: '1.1.0-free-tier',
    timestamp: new Date().toISOString(),
    database: 'local-persistent-store',
    currencyApi: 'open.er-api.com (free)',
    auth: 'local-session-ready',
  });
});

// ---------------------------------------------------------------------------
// 1. AUTHENTICATION & USER MANAGEMENT (Zero Paid SMS Keys)
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/auth/login
 * Clean Local Auth (Email + Password or Instant Guest Login)
 */
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password, userId } = req.body;

  // 1-Click Persona Login
  if (userId) {
    const user = db.getUserById(userId);
    if (user) {
      const token = `eqp_token_${Buffer.from(`${user.id}:${Date.now()}`).toString('base64')}`;
      return res.json({ success: true, token, user, message: `Logged in as ${user.name}` });
    }
  }

  // Email / Password Login
  const targetEmail = (email || '').toLowerCase().trim();
  let user = db.getUserByPhoneOrEmail(targetEmail);

  if (!user && targetEmail) {
    // Auto-create local testing profile if not yet registered
    const namePart = targetEmail.split('@')[0];
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    user = {
      id: `user_${Date.now()}`,
      name: formattedName,
      email: targetEmail,
      phone: '+1 555 0199',
      baseCurrency: 'USD',
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150`,
      createdAt: new Date().toISOString(),
    };
    db.saveUser(user);
  }

  // Fallback to primary test user (Satyam) if empty
  if (!user) {
    user = db.getAllUsers()[0];
  }

  const token = `eqp_token_${Buffer.from(`${user.id}:${Date.now()}`).toString('base64')}`;
  return res.json({
    success: true,
    token,
    user,
    message: 'Authenticated successfully',
  });
});

/**
 * POST /api/v1/auth/register
 */
apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const { name, email, phone, baseCurrency, avatarUrl } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const existing = db.getUserByPhoneOrEmail(email);
  if (existing) {
    const token = `eqp_token_${Buffer.from(`${existing.id}:${Date.now()}`).toString('base64')}`;
    return res.json({ success: true, token, user: existing, message: 'Existing profile loaded' });
  }

  const newUser: User = {
    id: `user_${Date.now()}`,
    name,
    email: email.toLowerCase().trim(),
    phone: phone || '+1 555 0100',
    baseCurrency: baseCurrency || 'USD',
    avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    createdAt: new Date().toISOString(),
  };

  db.saveUser(newUser);
  const token = `eqp_token_${Buffer.from(`${newUser.id}:${Date.now()}`).toString('base64')}`;
  return res.status(201).json({ success: true, token, user: newUser });
});

/**
 * POST /api/v1/auth/otp (Zero Paid Keys: Built-in local sandbox verification)
 */
apiRouter.post('/auth/otp', (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  db.setOTP(phone, code);

  return res.json({
    success: true,
    message: `Verification code generated for ${phone} (Zero paid SMS setup needed).`,
    sandboxCode: code,
    expiresInSeconds: 300,
  });
});

/**
 * POST /api/v1/auth/verify
 */
apiRouter.post('/auth/verify', (req: Request, res: Response) => {
  const { phone, code, name } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ error: 'Phone and code are required.' });
  }

  const isValid = db.verifyOTP(phone, code);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid verification code. Use sandbox code or 123456.' });
  }

  let user = db.getUserByPhoneOrEmail(phone);
  if (!user) {
    user = {
      id: `user_${Date.now()}`,
      name: name || `User ${phone.slice(-4)}`,
      phone,
      email: `${phone.replace(/\D/g, '')}@equalpay.dev`,
      baseCurrency: 'USD',
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150`,
      createdAt: new Date().toISOString(),
    };
    db.saveUser(user);
  }

  const token = `eqp_token_${Buffer.from(`${user.id}:${Date.now()}`).toString('base64')}`;
  return res.json({ success: true, token, user });
});

/**
 * GET /api/v1/users (List all persona profiles for instant 1-click switching)
 */
apiRouter.get('/users', (_req: Request, res: Response) => {
  return res.json(db.getAllUsers());
});

/**
 * GET /api/v1/users/me
 */
apiRouter.get('/users/me', (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const user = (userId && db.getUserById(userId)) || db.getAllUsers()[0];
  return res.json(user);
});

/**
 * PATCH /api/v1/users/me
 */
apiRouter.patch('/users/me', (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || db.getAllUsers()[0].id;
  const updated = db.updateUser(userId, req.body);
  return res.json(updated);
});

// ---------------------------------------------------------------------------
// 2. GROUPS MANAGEMENT
// ---------------------------------------------------------------------------

apiRouter.get('/groups', (_req: Request, res: Response) => {
  return res.json(db.getAllGroups());
});

apiRouter.get('/groups/:id', (req: Request, res: Response) => {
  const group = db.getGroupById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found.' });
  return res.json(group);
});

apiRouter.post('/groups', (req: Request, res: Response) => {
  const { name, category, defaultCurrency, avatarUrl, description, memberIds } = req.body;
  if (!name) return res.status(400).json({ error: 'Group name is required.' });

  const members: User[] = (memberIds || [])
    .map((id: string) => db.getUserById(id))
    .filter(Boolean);

  if (members.length === 0) {
    members.push(db.getAllUsers()[0]);
  }

  const newGroup: Group = {
    id: `group_${Date.now()}`,
    name,
    category: category || 'Trip',
    defaultCurrency: defaultCurrency || 'USD',
    description: description || '',
    avatarUrl: avatarUrl || '📁',
    members,
    createdAt: new Date().toISOString(),
  };

  db.saveGroup(newGroup);
  return res.status(201).json(newGroup);
});

apiRouter.post('/groups/:id/members', (req: Request, res: Response) => {
  const group = db.getGroupById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found.' });

  const { name, email, phone, avatarUrl, baseCurrency } = req.body;
  if (!name) return res.status(400).json({ error: 'Member name is required.' });

  const newMember: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name,
    email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@equalpay.dev`,
    phone: phone || '+1 555 0199',
    avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    baseCurrency: baseCurrency || group.defaultCurrency,
    createdAt: new Date().toISOString(),
  };

  const updatedGroup = db.addMemberToGroup(group.id, newMember);
  return res.status(201).json({ group: updatedGroup, addedUser: newMember });
});

// ---------------------------------------------------------------------------
// 3. EXPENSES & GRAPH DEBT RECALCULATION
// ---------------------------------------------------------------------------

apiRouter.post('/expenses', (req: Request, res: Response) => {
  const { groupId, title, totalAmount, currency, paidByUserId, splitType, splits, itemizedItems, category, notes } = req.body;
  if (!groupId || !title || !totalAmount || !paidByUserId || !splits) {
    return res.status(400).json({ error: 'Missing required expense parameters.' });
  }

  const expense: Expense = {
    id: req.body.id || `exp_${Date.now()}`,
    groupId,
    title,
    totalAmount: parseFloat(totalAmount),
    currency: currency || 'USD',
    paidByUserId,
    splitType: splitType || 'EQUAL',
    splits,
    itemizedItems: itemizedItems || undefined,
    category: category || 'Dining',
    notes: notes || undefined,
    date: req.body.date || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.saveExpense(expense);
  return res.status(201).json(expense);
});

apiRouter.get('/expenses/group/:groupId', (req: Request, res: Response) => {
  const expenses = db.getExpensesByGroupId(req.params.groupId);
  return res.json(expenses);
});

apiRouter.get('/groups/:id/optimized-debts', (req: Request, res: Response) => {
  const group = db.getGroupById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found.' });

  const targetCurrency = (req.query.currency as string) || group.defaultCurrency;
  const rates = currencyService.getRatesSync('USD');
  const groupExpenses = db.getExpensesByGroupId(group.id);
  const memberIds = group.members.map((m) => m.id);

  const simplifiedDebts = simplifyDebts(groupExpenses, memberIds, targetCurrency, rates);
  const netBalances = calculateNetBalances(groupExpenses, memberIds, targetCurrency, rates);

  return res.json({
    groupId: group.id,
    baseCurrency: targetCurrency,
    simplifiedDebts,
    netBalances,
    transactionCount: simplifiedDebts.length,
  });
});

// ---------------------------------------------------------------------------
// 4. SETTLEMENTS & REPAYMENTS
// ---------------------------------------------------------------------------

apiRouter.post('/settlements', (req: Request, res: Response) => {
  const { groupId, fromUserId, toUserId, amount, currency, method, note } = req.body;
  if (!fromUserId || !toUserId || !amount) {
    return res.status(400).json({ error: 'Missing settlement parameters.' });
  }

  const record: SettlementRecord = {
    id: req.body.id || `settle_${Date.now()}`,
    groupId,
    fromUserId,
    toUserId,
    amount: parseFloat(amount),
    currency: currency || 'USD',
    method: method || 'UPI',
    date: req.body.date || new Date().toISOString(),
    note: note || undefined,
  };

  db.saveSettlement(record);
  return res.status(201).json(record);
});

// ---------------------------------------------------------------------------
// 5. FREE PUBLIC MULTI-CURRENCY CONVERSION SERVICE
// ---------------------------------------------------------------------------

apiRouter.get('/currency/rates', async (req: Request, res: Response) => {
  const base = (req.query.base as string) || 'USD';
  const data = await currencyService.fetchLiveRates(base);
  return res.json(data);
});

// ---------------------------------------------------------------------------
// 6. OPTIMISTIC OFFLINE SYNC BATCH ENGINE (Last-Write-Wins)
// ---------------------------------------------------------------------------

apiRouter.post('/sync/batch', (req: Request, res: Response) => {
  const { items, deviceOrigin } = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'items array is required.' });
  }

  const results: Array<{ clientSyncId: string; status: string; entityId: string }> = [];

  for (const item of items) {
    const { id, operation, entityType, entityId, payload, timestamp } = item;

    try {
      if (operation === 'CREATE_EXPENSE' || operation === 'UPDATE_EXPENSE') {
        const exp = payload as Expense;
        const existing = db.getExpenseById(entityId);

        if (existing && existing.updatedAt && new Date(existing.updatedAt).getTime() > timestamp) {
          db.recordSyncAudit({
            id: `audit_${Date.now()}`,
            clientSyncId: id,
            userId: exp.paidByUserId,
            entityType: 'expense',
            entityId,
            operation,
            clientTime: new Date(timestamp).toISOString(),
            serverTime: new Date().toISOString(),
            deviceOrigin: deviceOrigin || 'web',
            status: 'CONFLICT_LWW_OVERRIDDEN',
          });
          results.push({ clientSyncId: id, status: 'CONFLICT_LWW_OVERRIDDEN', entityId });
          continue;
        }

        db.saveExpense({ ...exp, updatedAt: new Date().toISOString() });
      } else if (operation === 'SETTLE_DEBT') {
        db.saveSettlement(payload as SettlementRecord);
      }

      db.recordSyncAudit({
        id: `audit_${Date.now()}`,
        clientSyncId: id,
        userId: (payload as any).paidByUserId || (payload as any).fromUserId || 'system',
        entityType,
        entityId,
        operation,
        clientTime: new Date(timestamp).toISOString(),
        serverTime: new Date().toISOString(),
        deviceOrigin: deviceOrigin || 'web',
        status: 'APPLIED',
      });

      results.push({ clientSyncId: id, status: 'APPLIED', entityId });
    } catch (err: unknown) {
      results.push({
        clientSyncId: id,
        status: 'REJECTED',
        entityId,
      });
    }
  }

  return res.json({
    success: true,
    processedCount: items.length,
    results,
    syncedAt: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// 7. REMINDERS & NOTIFICATIONS (100% Free: WhatsApp & SMS Deep-Links)
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/reminders/send
 * Generates direct WhatsApp click-to-chat links (https://wa.me/?text=...) and SMS links
 * requiring ZERO paid third-party gateway API keys!
 */
apiRouter.post('/reminders/send', (req: Request, res: Response) => {
  const { debtorUserId, creditorUserId, amount, currency } = req.body;

  const debtor = debtorUserId ? db.getUserById(debtorUserId) : undefined;
  const creditor = creditorUserId ? db.getUserById(creditorUserId) : db.getAllUsers()[0];

  const cleanPhone = debtor?.phone ? debtor.phone.replace(/\D/g, '') : '';
  const messageText = `Hi ${debtor?.name || 'friend'}! Friendly settlement reminder for our group expense on Pay Manager: ${currency} ${amount} to ${creditor?.name}. Settle up: https://paymanager.app/settle?to=${creditor?.id}`;

  const encodedMsg = encodeURIComponent(messageText);

  // WhatsApp click-to-chat link (works on Web, Android, iOS without API keys)
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedMsg}`
    : `https://wa.me/?text=${encodedMsg}`;

  // Native SMS deep-link
  const smsUrl = cleanPhone ? `sms:${cleanPhone}?body=${encodedMsg}` : `sms:?body=${encodedMsg}`;

  return res.json({
    success: true,
    mechanism: 'DirectClientDeepLink (No Paid Gateway)',
    recipient: debtor?.name || 'Debtor',
    amount: `${currency} ${amount}`,
    whatsappUrl,
    smsUrl,
    message: messageText,
    generatedAt: new Date().toISOString(),
  });
});
