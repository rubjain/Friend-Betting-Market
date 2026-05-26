import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_PERMISSIONS,
  getAdminLevel,
  hasAdminPermission,
} from "../lib/server/adminPermissions.js";

function withDatabaseUrl(fn) {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://example/test";
  try {
    return fn();
  } finally {
    if (previous === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previous;
    }
  }
}

test("admin permission levels default demo admins to owner", () => {
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    const session = { isAdmin: true, userId: "user_1" };
    assert.equal(getAdminLevel(session, {}), "owner");
    assert.equal(hasAdminPermission(session, ADMIN_PERMISSIONS.CONFIG, {}), true);
  } finally {
    if (previous === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previous;
    }
  }
});

test("database admins default to viewer except seeded owner", () => {
  withDatabaseUrl(() => {
    assert.equal(getAdminLevel({ isAdmin: true, userId: "admin_1" }, {}), "owner");
    assert.equal(getAdminLevel({ isAdmin: true, userId: "admin_2" }, {}), "viewer");
    assert.equal(
      hasAdminPermission({ isAdmin: true, userId: "admin_2" }, ADMIN_PERMISSIONS.CONFIG, {}),
      false,
    );
    assert.equal(
      hasAdminPermission({ isAdmin: true, userId: "admin_2" }, ADMIN_PERMISSIONS.READ, {}),
      true,
    );
  });
});

test("configured admin levels grant scoped permissions", () => {
  withDatabaseUrl(() => {
    const env = {
      AGORA_ADMIN_LEVELS_JSON: JSON.stringify({
        risk_admin: "risk_manager",
        market_admin: "market_manager",
      }),
    };

    assert.equal(
      hasAdminPermission({ isAdmin: true, userId: "risk_admin" }, ADMIN_PERMISSIONS.RISK, env),
      true,
    );
    assert.equal(
      hasAdminPermission({ isAdmin: true, userId: "risk_admin" }, ADMIN_PERMISSIONS.FINANCE, env),
      false,
    );
    assert.equal(
      hasAdminPermission(
        { isAdmin: true, userId: "market_admin" },
        ADMIN_PERMISSIONS.MARKET_RESOLUTION,
        env,
      ),
      true,
    );
  });
});
