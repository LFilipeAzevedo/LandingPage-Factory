const PLAN_TIERS = {
    STATIC: 'static',
    BASIC: 'basic',
    PREMIUM: 'premium',
    ADMIN: 'adm_server'
};

const PLAN_LABELS = {
    [PLAN_TIERS.STATIC]: 'Static',
    [PLAN_TIERS.BASIC]: 'Básico',
    [PLAN_TIERS.PREMIUM]: 'Premium',
    [PLAN_TIERS.ADMIN]: 'Super Admin'
};

module.exports = {
    PLAN_TIERS,
    PLAN_LABELS,
    TIER_LIST: Object.values(PLAN_TIERS)
};
