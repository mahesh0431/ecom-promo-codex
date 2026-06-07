# Auth

V0 uses seeded-only demo authentication.

The seed process creates one demo user that matches the README credentials:

```text
demo@promo.test / demo-password
```

The app does not provide signup, invite, password reset, profile management, or user creation flows in V0.

This is intentional. The demo only needs enough authentication to prove that campaigns and generated images belong to an authenticated local user/session. It is not trying to be an identity product.

OpenAI/Codex runtime authentication is separate from app authentication. The backend owns OpenAI credentials and runtime readiness checks; the browser should only use the seeded app login.
