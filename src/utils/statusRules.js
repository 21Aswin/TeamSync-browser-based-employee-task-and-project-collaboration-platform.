/**
 * Centralized Task Status Transition Matrix
 *
 * Rules:
 * - TODO -> IN_PROGRESS, BLOCKED (Assignee, Manager, Admin)
 * - IN_PROGRESS -> UNDER_REVIEW, BLOCKED, TODO (Assignee, Manager, Admin)
 * - UNDER_REVIEW -> COMPLETED, IN_PROGRESS (Manager / Admin ONLY; reviewer controls completion)
 * - BLOCKED -> IN_PROGRESS (Assignee, Manager, Admin)
 * - COMPLETED -> IN_PROGRESS (Manager / Admin ONLY)
 */

const ALLOWED_TRANSITIONS = {
  TODO: ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['UNDER_REVIEW', 'BLOCKED', 'TODO'],
  UNDER_REVIEW: ['COMPLETED', 'IN_PROGRESS'],
  BLOCKED: ['IN_PROGRESS'],
  COMPLETED: ['IN_PROGRESS']
};

const MANAGER_ADMIN_ONLY_TARGETS = {
  UNDER_REVIEW: ['COMPLETED'],
  COMPLETED: ['IN_PROGRESS']
};

/**
 * Validate status transition
 * @param {string} currentStatus
 * @param {string} targetStatus
 * @param {string} userRole ADMIN | MANAGER | EMPLOYEE
 * @returns {{ valid: boolean, message?: string }}
 */
function validateStatusTransition(currentStatus, targetStatus, userRole) {
  const normCurrent = String(currentStatus).toUpperCase();
  const normTarget = String(targetStatus).toUpperCase();

  if (normCurrent === normTarget) {
    return { valid: true };
  }

  const allowed = ALLOWED_TRANSITIONS[normCurrent];
  if (!allowed || !allowed.includes(normTarget)) {
    return {
      valid: false,
      message: `Invalid transition from ${normCurrent} to ${normTarget}. Allowed transitions: ${allowed ? allowed.join(', ') : 'None'}.`
    };
  }

  // Check role restrictions
  const restrictedTargets = MANAGER_ADMIN_ONLY_TARGETS[normCurrent];
  if (restrictedTargets && restrictedTargets.includes(normTarget)) {
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      return {
        valid: false,
        message: `Moving task from ${normCurrent} to ${normTarget} requires Manager or Admin review authorization.`
      };
    }
  }

  return { valid: true };
}

module.exports = {
  ALLOWED_TRANSITIONS,
  validateStatusTransition
};
