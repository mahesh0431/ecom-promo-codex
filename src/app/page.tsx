import { cookies } from "next/headers";

import PromoWorkflow from "@/app/promo-workflow";
import { getSession } from "@/server/auth/session-service";
import { getServerEnv } from "@/server/env";
import {
  getProductOverview,
  listProductsForCampaignReview
} from "@/server/products/product-service";

export const dynamic = "force-dynamic";

export default async function Home() {
  const rawToken = await getRawSessionToken();

  if (!rawToken) {
    return (
      <PromoWorkflow
        initialAuthState="unauthenticated"
        initialUser={null}
        initialOverview={null}
        initialProducts={[]}
      />
    );
  }

  const session = await getSession(rawToken);

  if (!session) {
    return (
      <PromoWorkflow
        initialAuthState="unauthenticated"
        initialUser={null}
        initialOverview={null}
        initialProducts={[]}
      />
    );
  }

  const [overview, products] = await Promise.all([
    getProductOverview(),
    listProductsForCampaignReview()
  ]);

  return (
    <PromoWorkflow
      initialAuthState="authenticated"
      initialUser={session.user}
      initialOverview={overview}
      initialProducts={products}
    />
  );
}

async function getRawSessionToken() {
  const cookieStore = await cookies();
  const { sessionCookieName } = getServerEnv();

  return cookieStore.get(sessionCookieName)?.value ?? null;
}
