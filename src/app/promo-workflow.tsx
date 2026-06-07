"use client";

import {
  ArrowLeft,
  BarChart3,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Database,
  ImageIcon,
  LoaderCircle,
  Package,
  Plus,
  RefreshCcw,
  Sparkles,
  TrendingUp,
  Wand2,
  X
} from "lucide-react";
import { FormEvent, useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  CampaignDto,
  CampaignSummaryDto,
  OpportunityDto
} from "@/server/campaigns/campaign-types";
import type {
  ProductForCampaignReview,
  ProductOverview
} from "@/server/products/product-types";

const DEMO_EMAIL = "demo@promo.test";
const DEMO_PASSWORD = "demo-password";

type AuthenticatedUser = {
  id: string;
  email: string;
};

type ApiEnvelope<T> = {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};

type CampaignImageDto = {
  imageId: string;
  campaignId: string;
  variantIndex: number;
  mimeType: string;
  model: string | null;
  size: string | null;
  status: string;
  createdAt: string;
};

type CampaignDetailDto = {
  campaign: CampaignDto;
  images: CampaignImageDto[];
};

type AuthState = "checking" | "unauthenticated" | "authenticated";

type ViewState =
  | { kind: "dashboard" }
  | { kind: "product"; productId: string }
  | { kind: "campaign"; productId: string; campaignId?: string };

type AspectRatioOption = "Square" | "Portrait" | "Landscape";

type GenerateCampaignInput = {
  productId: string;
  discountPercent: number;
  quantityLimit: number;
  imageVariants: number;
  optionalInstructions?: string;
};

const aspectRatioOptions: AspectRatioOption[] = [
  "Square",
  "Portrait",
  "Landscape"
];

export default function PromoWorkflow({
  initialAuthState,
  initialUser,
  initialOverview,
  initialProducts
}: {
  initialAuthState: AuthState;
  initialUser: AuthenticatedUser | null;
  initialOverview: ProductOverview | null;
  initialProducts: ProductForCampaignReview[];
}) {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);
  const [user, setUser] = useState<AuthenticatedUser | null>(initialUser);
  const [overview, setOverview] = useState<ProductOverview | null>(
    initialOverview
  );
  const [products, setProducts] =
    useState<ProductForCampaignReview[]>(initialProducts);
  const [view, setView] = useState<ViewState>({ kind: "dashboard" });
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [opportunities, setOpportunities] = useState<OpportunityDto[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [campaignsByProduct, setCampaignsByProduct] = useState<
    Record<string, CampaignSummaryDto[]>
  >({});
  const [campaignDetailsById, setCampaignDetailsById] = useState<
    Record<string, CampaignDetailDto>
  >({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingHistoryProductId, setLoadingHistoryProductId] = useState<
    string | null
  >(null);
  const [loadingCampaignId, setLoadingCampaignId] = useState<string | null>(
    null
  );
  const [appError, setAppError] = useState<string | null>(null);

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.productId, product])),
    [products]
  );
  const selectedProduct = selectedProductId
    ? productsById.get(selectedProductId) ?? null
    : null;
  const opportunitiesByProductId = useMemo(
    () =>
      new Map(
        opportunities.map((opportunity) => [
          opportunity.productId,
          opportunity
        ])
      ),
    [opportunities]
  );

  const refreshProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const [nextOverview, productResult] = await Promise.all([
        apiGet<ProductOverview>("/api/products/overview"),
        apiGet<{ products: ProductForCampaignReview[] }>("/api/products")
      ]);

      setOverview(nextOverview);
      setProducts(productResult.products);
      setSelectedProductId((currentProductId) => {
        if (
          currentProductId &&
          productResult.products.some(
            (product) => product.productId === currentProductId
          )
        ) {
          return currentProductId;
        }

        return null;
      });
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const loadCampaignHistory = useCallback(async (productId: string) => {
    setLoadingHistoryProductId(productId);
    try {
      const result = await apiGet<{ campaigns: CampaignSummaryDto[] }>(
        `/api/campaigns?productId=${encodeURIComponent(productId)}`
      );

      setCampaignsByProduct((current) => ({
        ...current,
        [productId]: result.campaigns
      }));
    } finally {
      setLoadingHistoryProductId((currentProductId) =>
        currentProductId === productId ? null : currentProductId
      );
    }
  }, []);

  const loadCampaignDetail = useCallback(async (campaignId: string) => {
    setLoadingCampaignId(campaignId);
    try {
      const result = await apiGet<CampaignDetailDto>(
        `/api/campaigns/${encodeURIComponent(campaignId)}`
      );

      setCampaignDetailsById((current) => ({
        ...current,
        [campaignId]: result
      }));

      return result;
    } finally {
      setLoadingCampaignId(null);
    }
  }, []);

  async function handleLogin(email: string, password: string) {
    setAppError(null);
    const result = await apiPost<{ user: AuthenticatedUser }>(
      "/api/auth/login",
      { email, password }
    );

    setUser(result.user);
    setAuthState("authenticated");
    await refreshProducts();
  }

  async function handleAskCodex() {
    setAppError(null);
    setOpportunities([]);
    setSuggestionsOpen(true);
    setLoadingSuggestions(true);
    try {
      const result = await apiPost<{ opportunities: OpportunityDto[] }>(
        "/api/campaign-opportunities",
        {}
      );

      setOpportunities(result.opportunities);
      setSuggestionsOpen(true);
      if (!selectedProductId && result.opportunities[0]) {
        setSelectedProductId(result.opportunities[0].productId);
      }
    } catch (error) {
      setSuggestionsOpen(false);
      setAppError(toErrorMessage(error));
    } finally {
      setLoadingSuggestions(false);
    }
  }

  function openProduct(productId: string) {
    setView({ kind: "product", productId });
    setSelectedProductId(productId);
    void loadCampaignHistory(productId).catch((error) => {
      setAppError(toErrorMessage(error));
    });
  }

  function openCampaignCreate(productId: string) {
    setView({ kind: "campaign", productId });
    setSelectedProductId(productId);
  }

  function openExistingCampaign(productId: string, campaignId: string) {
    setView({ kind: "campaign", productId, campaignId });
    setSelectedProductId(productId);

    if (!campaignDetailsById[campaignId]) {
      void loadCampaignDetail(campaignId).catch((error) => {
        setAppError(toErrorMessage(error));
      });
    }
  }

  async function generateCampaign(input: GenerateCampaignInput) {
    setAppError(null);
    const result = await apiPost<CampaignDetailDto>(
      "/api/campaigns/generate",
      input
    );

    setCampaignDetailsById((current) => ({
      ...current,
      [result.campaign.campaignId]: result
    }));
    setView({
      kind: "campaign",
      productId: input.productId,
      campaignId: result.campaign.campaignId
    });
    await loadCampaignHistory(input.productId);

    return result;
  }

  async function generateAdditionalImage(campaignId: string) {
    setAppError(null);
    const result = await apiPost<{ images: CampaignImageDto[] }>(
      `/api/campaigns/${encodeURIComponent(campaignId)}/images/generate`,
      { variants: 1 }
    );

    setCampaignDetailsById((current) => {
      const existing = current[campaignId];

      if (!existing) {
        return current;
      }

      return {
        ...current,
        [campaignId]: {
          ...existing,
          images: [...existing.images, ...result.images]
        }
      };
    });

    const existing = campaignDetailsById[campaignId];
    if (existing) {
      await loadCampaignHistory(existing.campaign.productId);
    }
  }

  if (authState === "checking") {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <LoaderCircle className="size-4 animate-spin text-blue-600" />
          Loading Retail Promo Agent
        </div>
      </main>
    );
  }

  if (authState === "unauthenticated") {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onError={(message) => setAppError(message)}
        error={appError}
      />
    );
  }

  const currentProduct =
    view.kind === "product" || view.kind === "campaign"
      ? productsById.get(view.productId) ?? null
      : null;
  const currentCampaignDetail =
    view.kind === "campaign" && view.campaignId
      ? campaignDetailsById[view.campaignId] ?? null
      : null;

  return (
    <main className="min-h-screen px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6">
        {appError ? (
          <div className="flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span>{appError}</span>
            <button
              type="button"
              className="text-red-700 hover:text-red-950"
              onClick={() => setAppError(null)}
              aria-label="Dismiss error"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}

        {view.kind === "dashboard" ? (
          <DashboardView
            loading={loadingProducts}
            overview={overview}
            products={products}
            selectedProductId={selectedProductId}
            opportunitiesByProductId={opportunitiesByProductId}
            loadingSuggestions={loadingSuggestions}
            onSelectProduct={setSelectedProductId}
            onOpenProduct={openProduct}
            onAskCodex={() => void handleAskCodex()}
            onCreateCampaignForProduct={openCampaignCreate}
            onCreateCampaign={() => {
              if (selectedProduct) {
                openCampaignCreate(selectedProduct.productId);
              }
            }}
          />
        ) : null}

        {view.kind === "product" && currentProduct ? (
          <ProductDetailView
            product={currentProduct}
            campaigns={campaignsByProduct[currentProduct.productId] ?? []}
            loadingCampaigns={
              loadingHistoryProductId === currentProduct.productId
            }
            onBack={() => setView({ kind: "dashboard" })}
            onCreateCampaign={() => openCampaignCreate(currentProduct.productId)}
            onViewCampaign={(campaignId) =>
              openExistingCampaign(currentProduct.productId, campaignId)
            }
          />
        ) : null}

        {view.kind === "campaign" && currentProduct ? (
          <CampaignWorkspace
            key={`${currentProduct.productId}:${view.campaignId ?? "new"}`}
            product={currentProduct}
            campaignDetail={currentCampaignDetail}
            loadingCampaign={
              view.campaignId ? loadingCampaignId === view.campaignId : false
            }
            onBack={() => {
              setView({ kind: "product", productId: currentProduct.productId });
              void loadCampaignHistory(currentProduct.productId).catch(
                (error) => setAppError(toErrorMessage(error))
              );
            }}
            onGenerate={generateCampaign}
            onGenerateAnotherImage={generateAdditionalImage}
            onError={(message) => setAppError(message)}
          />
        ) : null}

        {view.kind !== "dashboard" && !currentProduct ? (
          <EmptyState
            title="Product not found"
            description="Return to products and choose a current catalog item."
            actionLabel="Back to products"
            onAction={() => setView({ kind: "dashboard" })}
          />
        ) : null}
      </div>

      {suggestionsOpen ? (
        <SuggestionDialog
          loading={loadingSuggestions}
          opportunities={opportunities}
          productsById={productsById}
          onClose={() => setSuggestionsOpen(false)}
        />
      ) : null}

      <span className="sr-only">
        Signed in as {user?.email ?? "demo user"}
      </span>
    </main>
  );
}

function LoginScreen({
  onLogin,
  onError,
  error
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  onError: (message: string) => void;
  error: string | null;
}) {
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    onError("");
    try {
      await onLogin(email, password);
    } catch (loginError) {
      onError(toErrorMessage(loginError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="w-full max-w-[420px] rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-lg bg-blue-50 text-blue-700">
            <Wand2 className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-950">
              Retail Promo Agent
            </h1>
            <p className="text-sm text-slate-500">
              Sign in with the seeded demo account.
            </p>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
            type="email"
            autoComplete="email"
          />
        </label>

        <label className="mb-5 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Password
          </span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
            type="password"
            autoComplete="current-password"
          />
        </label>

        <Button className="h-10 w-full bg-blue-600 hover:bg-blue-700" type="submit">
          {loading ? <LoaderCircle className="size-4 animate-spin" /> : null}
          Sign in
        </Button>
      </form>
    </main>
  );
}

function DashboardView({
  loading,
  overview,
  products,
  selectedProductId,
  opportunitiesByProductId,
  loadingSuggestions,
  onSelectProduct,
  onOpenProduct,
  onAskCodex,
  onCreateCampaignForProduct,
  onCreateCampaign
}: {
  loading: boolean;
  overview: ProductOverview | null;
  products: ProductForCampaignReview[];
  selectedProductId: string | null;
  opportunitiesByProductId: Map<string, OpportunityDto>;
  loadingSuggestions: boolean;
  onSelectProduct: (productId: string | null) => void;
  onOpenProduct: (productId: string) => void;
  onAskCodex: () => void;
  onCreateCampaignForProduct: (productId: string) => void;
  onCreateCampaign: () => void;
}) {
  const [openRecommendationProductId, setOpenRecommendationProductId] =
    useState<string | null>(null);

  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        <MetricTile
          icon={<Package className="size-7" />}
          iconTone="blue"
          label="Total products"
          value={overview ? numberFormat.format(overview.totalProducts) : "-"}
          helper="Across all categories"
        />
        <MetricTile
          icon={<TrendingUp className="size-7" />}
          iconTone="green"
          label="Sold this month"
          value={
            overview ? numberFormat.format(overview.unitsSoldThisMonth) : "-"
          }
          helper="Units sold in current month"
        />
        <MetricTile
          icon={<Boxes className="size-7" />}
          iconTone="violet"
          label="Available stock"
          value={
            overview ? numberFormat.format(overview.totalAvailableStock) : "-"
          }
          helper="Across all products"
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">
              Product sales
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Overview of product performance and inventory.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              className="h-10 bg-blue-600 px-4 hover:bg-blue-700"
              type="button"
              onClick={onAskCodex}
              disabled={loadingSuggestions || loading}
            >
              {loadingSuggestions ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {loadingSuggestions
                ? "Generating suggestions"
                : "Generate Promotion Suggestions"}
            </Button>
            <Button
              className="h-10 px-4"
              type="button"
              variant="outline"
              onClick={onCreateCampaign}
              disabled={!selectedProductId}
            >
              <Plus className="size-4" />
              Create campaign
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <th className="w-[88px] px-5 py-3">Select</th>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Price</th>
                <th className="px-5 py-3">Available</th>
                <th className="px-5 py-3">Sold this month</th>
                <th className="px-5 py-3">Suggested</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const selected = selectedProductId === product.productId;
                const recommendation = opportunitiesByProductId.get(
                  product.productId
                );
                const suggested = Boolean(recommendation);
                const recommendationOpen =
                  openRecommendationProductId === product.productId;

                return (
                  <tr
                    key={product.productId}
                    onClick={() => onOpenProduct(product.productId)}
                    className={cn(
                      "cursor-pointer border-b border-slate-100 text-sm transition last:border-b-0 hover:bg-slate-50",
                      selected && "bg-blue-50/70",
                      suggested && !selected && "bg-sky-50/45"
                    )}
                  >
                    <td className="px-5 py-4 align-middle">
                      <input
                        type="checkbox"
                        className="size-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={selected}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() =>
                          onSelectProduct(selected ? null : product.productId)
                        }
                        aria-label={`Select ${product.name}`}
                      />
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <button
                        type="button"
                        className="font-semibold text-slate-950 hover:text-blue-700"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenProduct(product.productId);
                        }}
                      >
                        {product.name}
                      </button>
                      <div className="mt-1 text-xs text-slate-500">
                        {product.sku}
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle text-slate-600">
                      {product.category}
                    </td>
                    <td className="px-5 py-4 align-middle">
                      {formatCents(product.priceCents)}
                    </td>
                    <td className="px-5 py-4 align-middle">
                      {numberFormat.format(product.availableQuantity)}
                    </td>
                    <td className="px-5 py-4 align-middle">
                      {numberFormat.format(product.unitsSoldThisMonth)}
                    </td>
                    <td
                      className="relative px-5 py-4 align-middle"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {recommendation ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "h-8 px-3 text-xs",
                              recommendationOpen && "relative z-30"
                            )}
                            aria-haspopup="dialog"
                            aria-expanded={recommendationOpen}
                            onClick={() =>
                              setOpenRecommendationProductId((current) =>
                                current === product.productId
                                  ? null
                                  : product.productId
                              )
                            }
                          >
                            <Sparkles className="size-3.5" />
                            View recommendation
                          </Button>
                          {recommendationOpen ? (
                            <>
                              <button
                                type="button"
                                className="fixed inset-0 z-20 cursor-default"
                                aria-label="Close recommendation"
                                onClick={() => setOpenRecommendationProductId(null)}
                              />
                              <RecommendationPopover
                                product={product}
                                opportunity={recommendation}
                                onCreateCampaign={() =>
                                  onCreateCampaignForProduct(product.productId)
                                }
                                onClose={() => setOpenRecommendationProductId(null)}
                              />
                            </>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm text-slate-500">
          <span>
            Showing {products.length ? 1 : 0} to {products.length} of{" "}
            {products.length} products
          </span>
          {loading ? (
            <span className="flex items-center gap-2">
              <LoaderCircle className="size-4 animate-spin" />
              Refreshing
            </span>
          ) : null}
        </div>
      </section>
    </>
  );
}

function RecommendationPopover({
  product,
  opportunity,
  onCreateCampaign,
  onClose
}: {
  product: ProductForCampaignReview;
  opportunity: OpportunityDto;
  onCreateCampaign: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label={`AI recommendation for ${product.name}`}
      className="absolute right-5 top-14 z-40 w-[340px] rounded-lg border border-slate-200 bg-white p-4 text-left shadow-xl"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            AI recommendation
          </p>
          <p className="mt-1 text-xs text-slate-500">{product.name}</p>
        </div>
        <button
          type="button"
          className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          onClick={onClose}
          aria-label="Close recommendation"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mb-3">
        <StatusPill tone={confidenceTone(opportunity.confidence)}>
          {opportunity.confidence}
        </StatusPill>
      </div>

      <p className="text-sm leading-6 text-slate-600">
        <span className="font-medium text-slate-800">Why picked:</span>{" "}
        {opportunity.reasoning}
      </p>

      <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
        <Button
          type="button"
          className="h-9 bg-blue-600 px-3 text-xs hover:bg-blue-700"
          onClick={onCreateCampaign}
        >
          <Plus className="size-3.5" />
          Create campaign
        </Button>
      </div>
    </div>
  );
}

function ProductDetailView({
  product,
  campaigns,
  loadingCampaigns,
  onBack,
  onCreateCampaign,
  onViewCampaign
}: {
  product: ProductForCampaignReview;
  campaigns: CampaignSummaryDto[];
  loadingCampaigns: boolean;
  onBack: () => void;
  onCreateCampaign: () => void;
  onViewCampaign: (campaignId: string) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <Button type="button" variant="link" className="px-0" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Products
        </Button>
        <Button
          type="button"
          className="h-10 bg-blue-600 px-4 hover:bg-blue-700"
          onClick={onCreateCampaign}
        >
          Create campaign
          <Plus className="size-4" />
        </Button>
      </div>

      <h1 className="text-3xl font-semibold text-slate-950">{product.name}</h1>

      <section className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-[1fr_440px]">
        <div className="p-5">
          <div className="grid gap-5 border-b border-slate-200 pb-5 sm:grid-cols-4">
            <Fact label="SKU" value={product.sku} />
            <Fact label="Category" value={product.category} />
            <Fact label="Unit price" value={formatCents(product.priceCents)} />
            <Fact label="Inventory status" value={stockLabel(product)} />
          </div>
          <div className="grid gap-5 pt-5 sm:grid-cols-3">
            <InventoryFact
              icon={<Package className="size-5" />}
              label="Available stock"
              value={`${numberFormat.format(product.availableQuantity)} units`}
            />
            <InventoryFact
              icon={<TrendingUp className="size-5" />}
              label="Sold this month"
              value={`${numberFormat.format(product.unitsSoldThisMonth)} units`}
            />
            <InventoryFact
              icon={<BarChart3 className="size-5" />}
              label="Sales summary"
              value={product.recentSalesSummary}
            />
          </div>
        </div>
        <aside className="border-t border-slate-200 p-5 lg:border-l lg:border-t-0">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-700">
              <BarChart3 className="size-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-950">
              Why this product needs attention
            </h2>
          </div>
          <div className="space-y-4">
            {product.signalFacts.map((fact) => (
              <div key={fact} className="flex gap-3">
                <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-blue-700">
                  <Database className="size-4" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{factTitle(fact)}</p>
                  <p className="mt-1 text-sm text-slate-500">{fact}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 className="text-xl font-semibold text-slate-950">
            Campaign history
          </h2>
          {loadingCampaigns ? (
            <span className="inline-flex items-center gap-2 text-sm text-slate-500">
              <LoaderCircle className="size-4 animate-spin text-blue-600" />
              Loading history
            </span>
          ) : null}
        </div>
        {loadingCampaigns && !campaigns.length ? (
          <LoadingPanel label="Loading campaign history" />
        ) : campaigns.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3">Discount</th>
                  <th className="px-5 py-3">Quantity limit</th>
                  <th className="px-5 py-3">Images</th>
                  <th className="px-5 py-3">Caption status</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr
                    key={campaign.campaignId}
                    onClick={() => onViewCampaign(campaign.campaignId)}
                    className="cursor-pointer border-b border-slate-100 text-sm last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">{formatDateTime(campaign.createdAt)}</td>
                    <td className="px-5 py-4">
                      <StatusPill tone="blue">
                        {campaign.discountPercent}% OFF
                      </StatusPill>
                    </td>
                    <td className="px-5 py-4">
                      {numberFormat.format(campaign.quantityLimit)} units
                    </td>
                    <td className="px-5 py-4">
                      {numberFormat.format(campaign.imageCount)} generated
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 text-slate-700">
                        <CheckCircle2 className="size-4 text-green-600" />
                        Completed
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8"
                        onClick={(event) => {
                          event.stopPropagation();
                          onViewCampaign(campaign.campaignId);
                        }}
                      >
                        View campaign
                        <ChevronRight className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12">
            <EmptyState
              title="No campaigns yet"
              description="Create the first promo campaign for this product."
              actionLabel="Create campaign"
              onAction={onCreateCampaign}
            />
          </div>
        )}
      </section>
    </>
  );
}

function CampaignWorkspace({
  product,
  campaignDetail,
  loadingCampaign,
  onBack,
  onGenerate,
  onGenerateAnotherImage,
  onError
}: {
  product: ProductForCampaignReview;
  campaignDetail: CampaignDetailDto | null;
  loadingCampaign: boolean;
  onBack: () => void;
  onGenerate: (input: GenerateCampaignInput) => Promise<CampaignDetailDto>;
  onGenerateAnotherImage: (campaignId: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [discountPercent, setDiscountPercent] = useState(15);
  const [quantityLimit, setQuantityLimit] = useState(
    Math.max(1, Math.min(product.availableQuantity, 50))
  );
  const [imageVariants, setImageVariants] = useState(2);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>("Square");
  const [customImagePrompt, setCustomImagePrompt] = useState("");
  const [campaignInstructions, setCampaignInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  const readOnly = Boolean(campaignDetail) || loadingCampaign;
  const displayedDiscountPercent =
    campaignDetail?.campaign.discountPercent ?? discountPercent;
  const displayedQuantityLimit =
    campaignDetail?.campaign.quantityLimit ?? quantityLimit;
  const displayedImageVariants =
    campaignDetail?.campaign.initialImageVariantsRequested ?? imageVariants;
  const displayedAspectRatio = campaignDetail
    ? extractAspectRatio(campaignDetail.campaign.optionalInstructions) ??
      "Square"
    : aspectRatio;
  const displayedCustomImagePrompt = campaignDetail
    ? extractCustomImagePrompt(campaignDetail.campaign.optionalInstructions)
    : customImagePrompt;
  const displayedCampaignInstructions =
    campaignDetail?.campaign.optionalInstructions ?? campaignInstructions;
  const validQuantity =
    quantityLimit >= 1 && quantityLimit <= product.availableQuantity;
  const validDiscount = discountPercent >= 1 && discountPercent <= 100;
  const canGenerate =
    !readOnly && validQuantity && validDiscount && imageVariants >= 1;

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canGenerate) {
      onError("Check the discount and quantity limit before generating.");
      return;
    }

    setGenerating(true);
    try {
      await onGenerate({
        productId: product.productId,
        discountPercent,
        quantityLimit,
        imageVariants,
        optionalInstructions: buildOptionalInstructions({
          aspectRatio,
          customImagePrompt,
          campaignInstructions
        })
      });
    } catch (error) {
      onError(toErrorMessage(error));
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateAnotherImage() {
    if (!campaignDetail) {
      return;
    }

    setGeneratingImage(true);
    try {
      await onGenerateAnotherImage(campaignDetail.campaign.campaignId);
    } catch (error) {
      onError(toErrorMessage(error));
    } finally {
      setGeneratingImage(false);
    }
  }

  return (
    <>
      <div>
        <Button type="button" variant="link" className="px-0" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Product details
        </Button>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Promo campaign
        </h1>
      </div>

      <section className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-slate-100 text-blue-700">
            <Package className="size-6" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-950">
              {product.name}
            </h2>
            <p className="text-sm text-slate-500">{product.category}</p>
          </div>
        </div>
        <div className="grid gap-5 border-t border-slate-200 pt-5 sm:grid-cols-2 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <Fact
            label="Available stock"
            value={`${numberFormat.format(product.availableQuantity)} units`}
          />
          <Fact
            label="Sold this month"
            value={`${numberFormat.format(product.unitsSoldThisMonth)} units`}
          />
        </div>
      </section>

      <form
        onSubmit={(event) => void handleGenerate(event)}
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-950">
          Campaign setup
        </h2>

        <div className="grid gap-5 lg:grid-cols-[minmax(360px,0.9fr)_minmax(320px,1.1fr)]">
          <div className="space-y-4">
            <div className="space-y-4">
              <DiscountSlider
                value={displayedDiscountPercent}
                disabled={readOnly || generating}
                onChange={setDiscountPercent}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Quantity limit"
                  suffix="units"
                  min={1}
                  max={product.availableQuantity}
                  value={displayedQuantityLimit}
                  disabled={readOnly || generating}
                  onChange={setQuantityLimit}
                />
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Image variants
                  </label>
                  <div className="grid grid-cols-2 divide-x divide-slate-300 overflow-hidden rounded-lg border border-slate-300">
                    {[1, 2].map((variantCount) => (
                      <button
                        key={variantCount}
                        type="button"
                        className={segmentedButtonClass(
                          displayedImageVariants === variantCount
                        )}
                        disabled={readOnly || generating}
                        onClick={() => setImageVariants(variantCount)}
                      >
                        {variantCount}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Aspect ratio
              </label>
              <div className="grid divide-y divide-slate-300 overflow-hidden rounded-lg border border-slate-300 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {aspectRatioOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={segmentedButtonClass(
                      displayedAspectRatio === option
                    )}
                    disabled={readOnly || generating}
                    onClick={() => setAspectRatio(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Custom image prompt
            </span>
            <textarea
              className="min-h-[84px] w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-100 disabled:bg-slate-50"
              maxLength={500}
              value={displayedCustomImagePrompt}
              disabled={readOnly || generating}
              placeholder="Add a design direction for the campaign image..."
              onChange={(event) => setCustomImagePrompt(event.target.value)}
            />
            <span className="mt-1 block text-right text-xs text-slate-500">
              {displayedCustomImagePrompt.length} / 500
            </span>
          </label>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Campaign instructions
            </span>
            <textarea
              className="min-h-[108px] w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-100 disabled:bg-slate-50"
              maxLength={900}
              value={displayedCampaignInstructions}
              disabled={readOnly || generating}
              placeholder="Add any specific instructions for Codex to consider..."
              onChange={(event) => setCampaignInstructions(event.target.value)}
            />
            <span className="mt-1 block text-right text-xs text-slate-500">
              {displayedCampaignInstructions.length} / 900
            </span>
          </label>

          <Button
            type="submit"
            className="h-10 bg-blue-600 px-6 hover:bg-blue-700"
            disabled={!canGenerate || generating}
          >
            {generating ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {generating ? "Generating campaign" : "Generate"}
          </Button>
        </div>

        {!validQuantity ? (
          <p className="mt-3 text-sm text-red-700">
            Quantity limit cannot exceed available stock.
          </p>
        ) : null}
      </form>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">
          Campaign details
        </h2>
        {generating ? (
          <LoadingPanel label="Generating campaign and images" />
        ) : loadingCampaign ? (
          <LoadingPanel label="Loading campaign" />
        ) : campaignDetail ? (
          <>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <DetailRow
                icon={<Wand2 className="size-4" />}
                label="AI recommendation"
                value={campaignDetail.campaign.codexReasoning}
              />
              <DetailRow
                icon={<Sparkles className="size-4" />}
                label="Instagram caption"
                value={campaignDetail.campaign.instagramCaption}
              />
              <DetailRow
                icon={<ImageIcon className="size-4" />}
                label="Image prompt"
                value={campaignDetail.campaign.imagePrompt}
              />
              <DetailRow
                icon={<Package className="size-4" />}
                label="Campaign instructions"
                value={campaignDetail.campaign.optionalInstructions ?? "None"}
              />
            </div>

            <div className="mt-5">
              <h3 className="mb-3 text-lg font-semibold text-slate-950">
                Generated images
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-3">
                {campaignDetail.images.map((image) => (
                  <article
                    key={image.imageId}
                    className="grid min-w-[340px] grid-cols-[150px_1fr] gap-4 rounded-lg border border-slate-200 bg-white p-3"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- Protected campaign-image route should render with the browser session cookie. */}
                    <img
                      src={`/api/campaigns/${encodeURIComponent(image.campaignId)}/images/${encodeURIComponent(image.imageId)}`}
                      alt={`Campaign image variant ${image.variantIndex}`}
                      className="aspect-square w-full rounded-lg border border-slate-200 object-cover"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-slate-950">
                          Variant {image.variantIndex}
                        </h4>
                        <StatusPill tone="green">{image.status}</StatusPill>
                      </div>
                      <p className="mt-4 text-sm text-slate-500">
                        {image.size ?? "1024x1024"}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        {image.model ?? "image model"}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        {formatDate(image.createdAt)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-2 h-9"
                onClick={() => void handleGenerateAnotherImage()}
                disabled={generatingImage}
              >
                {generatingImage ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <RefreshCcw className="size-4" />
                )}
                {generatingImage ? "Generating image" : "Generate another image"}
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 px-5 py-10 text-sm text-slate-500">
            Generated copy, image prompt, and image variants will appear here
            after the campaign is created.
          </div>
        )}
      </section>
    </>
  );
}

function SuggestionDialog({
  loading,
  opportunities,
  productsById,
  onClose
}: {
  loading: boolean;
  opportunities: OpportunityDto[];
  productsById: Map<string, ProductForCampaignReview>;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/18 px-4 py-8 backdrop-blur-[2px]"
      role="presentation"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="promotion-suggestions-title"
        className="w-full max-w-[520px] rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2
              id="promotion-suggestions-title"
              className="text-xl font-semibold text-slate-950"
            >
              Promotion suggestions
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Recommended products based on current inventory and sales.
            </p>
          </div>
          <button
            type="button"
            className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            onClick={onClose}
            aria-label="Close suggestions"
          >
            <X className="size-4" />
          </button>
        </div>

        {loading ? (
          <LoadingPanel label="Generating promotion suggestions" />
        ) : (
          <div className="space-y-3">
            {opportunities.map((opportunity, index) => {
            const product = productsById.get(opportunity.productId);

            return (
              <article
                key={`${opportunity.productId}-${opportunity.sku}`}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex gap-3">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-sm font-semibold text-blue-700">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-950">
                        {product?.name ?? opportunity.sku}
                      </h3>
                      <StatusPill tone={confidenceTone(opportunity.confidence)}>
                        {opportunity.confidence}
                      </StatusPill>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      <span className="font-medium text-slate-800">
                        Why picked:
                      </span>{" "}
                      {opportunity.reasoning}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </section>
    </div>
  );
}

function MetricTile({
  icon,
  iconTone,
  label,
  value,
  helper
}: {
  icon: React.ReactNode;
  iconTone: "blue" | "green" | "violet";
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <article className="flex items-center gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div
        className={cn(
          "grid size-20 shrink-0 place-items-center rounded-lg",
          iconTone === "blue" && "bg-blue-50 text-blue-700",
          iconTone === "green" && "bg-green-50 text-green-700",
          iconTone === "violet" && "bg-violet-50 text-violet-700"
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-base text-slate-600">{label}</p>
        <p className="mt-1 text-4xl font-semibold text-slate-950">{value}</p>
        <p className="mt-2 text-sm text-slate-500">{helper}</p>
      </div>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function InventoryFact({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-lg bg-blue-50 text-blue-700">
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 font-semibold text-slate-950">{value}</p>
      </div>
    </div>
  );
}

function NumberField({
  label,
  suffix,
  min,
  max,
  value,
  disabled,
  onChange
}: {
  label: string;
  suffix: string;
  min: number;
  max: number;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <span className="flex h-10 items-center rounded-lg border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-3 focus-within:ring-blue-100">
        <input
          type="number"
          className="h-full min-w-0 flex-1 rounded-l-lg bg-transparent px-3 text-sm outline-none disabled:bg-slate-50"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(toInteger(event.target.value))}
        />
        <span className="shrink-0 px-3 text-xs text-slate-500">{suffix}</span>
      </span>
    </label>
  );
}

function DiscountSlider({
  value,
  disabled,
  onChange
}: {
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <label
          className="text-sm font-medium text-slate-700"
          htmlFor="discount-percent"
        >
          Discount percent
        </label>
        <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-sm font-semibold text-blue-700">
          {value}%
        </span>
      </div>
      <input
        id="discount-percent"
        type="range"
        min={1}
        max={100}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(toInteger(event.target.value))}
        className="h-2 w-full cursor-pointer accent-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
      />
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>1%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-3 border-b border-slate-200 px-4 py-3 text-sm last:border-b-0 md:grid-cols-[180px_1fr]">
      <div className="flex items-center gap-2 text-slate-600">
        <span className="grid size-7 place-items-center rounded-lg bg-blue-50 text-blue-700">
          {icon}
        </span>
        {label}
      </div>
      <p className="min-w-0 whitespace-pre-wrap text-slate-800">{value}</p>
    </div>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="mx-auto max-w-[460px] text-center">
      <div className="mx-auto mb-4 grid size-12 place-items-center rounded-lg bg-slate-100 text-slate-600">
        <ImageIcon className="size-5" />
      </div>
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <Button type="button" className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-600">
      <LoaderCircle className="size-4 animate-spin text-blue-600" />
      {label}
    </div>
  );
}

function StatusPill({
  children,
  tone
}: {
  children: React.ReactNode;
  tone: "blue" | "green" | "amber";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2 py-1 text-xs font-medium",
        tone === "blue" && "bg-blue-50 text-blue-700",
        tone === "green" && "bg-green-50 text-green-700",
        tone === "amber" && "bg-amber-50 text-amber-700"
      )}
    >
      {children}
    </span>
  );
}

function segmentedButtonClass(isActive: boolean) {
  return cn(
    "h-10 text-sm transition disabled:cursor-not-allowed",
    isActive
      ? "bg-blue-50 font-semibold text-blue-700"
      : "bg-white text-slate-700 hover:bg-slate-50"
  );
}

async function apiGet<T>(path: string) {
  return apiRequest<T>(path);
}

async function apiPost<T>(path: string, body: unknown) {
  return apiRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

async function apiRequest<T>(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Request failed: ${response.status}`);
  }

  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    throw new Error("Unexpected API response.");
  }

  return payload.data as T;
}

function buildOptionalInstructions(input: {
  aspectRatio: AspectRatioOption;
  customImagePrompt: string;
  campaignInstructions: string;
}) {
  const parts = [
    `Image aspect ratio preference: ${input.aspectRatio}.`,
    input.customImagePrompt.trim()
      ? `Custom image prompt: ${input.customImagePrompt.trim()}`
      : "",
    input.campaignInstructions.trim()
      ? `Campaign instructions: ${input.campaignInstructions.trim()}`
      : ""
  ].filter(Boolean);

  return parts.join("\n").slice(0, 1000);
}

function extractAspectRatio(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/Image aspect ratio preference: (Square|Portrait|Landscape)\./);

  return (match?.[1] as AspectRatioOption | undefined) ?? null;
}

function extractCustomImagePrompt(value: string | null) {
  if (!value) {
    return "";
  }

  const match = value.match(/Custom image prompt: ([\s\S]*?)(?:\nCampaign instructions:|$)/);

  return match?.[1]?.trim() ?? "";
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function toInteger(value: string) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

function formatCents(value: number) {
  return currencyFormat.format(value / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function stockLabel(product: ProductForCampaignReview) {
  if (product.availableQuantity >= 100 && product.unitsSoldThisMonth <= 5) {
    return "Needs promo";
  }

  if (product.availableQuantity >= 100) {
    return "High stock";
  }

  if (product.availableQuantity <= 50) {
    return "Low stock";
  }

  return "Balanced";
}

function factTitle(fact: string) {
  const [title] = fact.split(":");

  return title || "Product signal";
}

function confidenceTone(confidence: OpportunityDto["confidence"]) {
  if (confidence === "high") {
    return "green";
  }

  if (confidence === "medium") {
    return "amber";
  }

  return "blue";
}

const numberFormat = new Intl.NumberFormat("en-US");
const currencyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});
