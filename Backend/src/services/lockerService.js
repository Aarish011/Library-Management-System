const LockerAllocation = require('../models/LockerAllocation');
const AuditLog = require('../models/AuditLog');

async function deductLockerSecurity({
  allocationId,
  amount,
  actorId,
  reason = 'locker_damage',
}) {
  const deduction = Number(amount);
  if (!Number.isFinite(deduction) || deduction <= 0) {
    const error = new Error('Deduction amount must be greater than zero');
    error.statusCode = 400;
    throw error;
  }

  const allocation = await LockerAllocation.findById(allocationId);
  if (!allocation) {
    const error = new Error('Locker allocation not found');
    error.statusCode = 404;
    throw error;
  }

  const availableDeposit =
    allocation.securityDepositAmount -
    allocation.totalDeductions -
    allocation.refundedAmount;

  if (deduction > availableDeposit) {
    const error = new Error('Deduction cannot exceed available security deposit');
    error.statusCode = 400;
    throw error;
  }

  allocation.totalDeductions += deduction;
  allocation.securityDepositStatus =
    allocation.totalDeductions >= allocation.securityDepositAmount
      ? 'deducted'
      : 'partially_refunded';
  await allocation.save();

  await AuditLog.create({
    actor: actorId,
    user: allocation.user,
    entityType: 'LockerAllocation',
    entity: allocation._id,
    action: 'locker_security_deducted',
    amount: deduction,
    metadata: { reason },
  });

  return allocation;
}

async function refundLockerSecurity({ allocationId, amount, actorId }) {
  const refund = Number(amount);
  if (!Number.isFinite(refund) || refund <= 0) {
    const error = new Error('Refund amount must be greater than zero');
    error.statusCode = 400;
    throw error;
  }

  const allocation = await LockerAllocation.findById(allocationId);
  if (!allocation) {
    const error = new Error('Locker allocation not found');
    error.statusCode = 404;
    throw error;
  }

  const availableDeposit =
    allocation.securityDepositAmount -
    allocation.totalDeductions -
    allocation.refundedAmount;

  if (refund > availableDeposit) {
    const error = new Error('Refund cannot exceed available security deposit');
    error.statusCode = 400;
    throw error;
  }

  allocation.refundedAmount += refund;
  allocation.refundedAt =
    allocation.refundedAmount + allocation.totalDeductions >=
    allocation.securityDepositAmount
      ? new Date()
      : null;
  allocation.securityDepositStatus = allocation.refundedAt
    ? 'refunded'
    : 'partially_refunded';

  if (allocation.refundedAt) {
    allocation.status = 'returned';
    allocation.returnedAt = allocation.returnedAt || allocation.refundedAt;
  }

  await allocation.save();

  await AuditLog.create({
    actor: actorId,
    user: allocation.user,
    entityType: 'LockerAllocation',
    entity: allocation._id,
    action: 'locker_security_refunded',
    amount: refund,
    metadata: {},
  });

  return allocation;
}

module.exports = {
  deductLockerSecurity,
  refundLockerSecurity,
};
