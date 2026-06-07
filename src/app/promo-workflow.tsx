"use client";

import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Boxes,
  CheckCircle2,
  ChevronRight,
  ChevronsUpDown,
  ImageIcon,
  LoaderCircle,
  LogOut,
  Mic,
  Package,
  Plus,
  RefreshCcw,
  Square,
  Sparkles,
  Tag,
  TrendingUp,
  Wand2,
  X
} from "lucide-react";
import { FormEvent, useCallback, useMemo, useRef, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { applyCampaignDraftPatch } from "@/app/voice/campaign-draft-state";
import {
  formatCampaignResolutionFailure,
  resolveCampaignReference
} from "@/app/voice/campaign-resolution";
import { buildVoiceScreenContext } from "@/app/voice/screen-context";
import { resolveProductReference } from "@/app/voice/product-resolution";
import {
  formatProductResolutionFailure,
  voiceFailure,
  voiceSuccess
} from "@/app/voice/voice-actions";
import { useRealtimeVoiceSession } from "@/app/voice/use-realtime-voice-session";
import type { PromoWorkflowCommands } from "@/app/voice/workflow-command-types";
import type {
  VoiceActiveDialog,
  VoiceCampaignDraft,
  VoiceCommandResult
} from "@/app/voice/voice-types";
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
  imageUrl: string;
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
  | {
      kind: "campaign";
      productId: string;
      campaignId?: string;
      suggestedOffer?: CampaignOfferDraft;
    };

type AspectRatioOption = "Square" | "Portrait" | "Landscape";

type CampaignOfferDraft = {
  discountPercent: number;
  quantityLimit: number;
};

type SortDirection = "asc" | "desc";

type ProductSortKey =
  | "name"
  | "category"
  | "price"
  | "available"
  | "sold"
  | "suggested";

type ProductSortState = {
  key: ProductSortKey;
  direction: SortDirection;
};

type CampaignSortKey =
  | "created"
  | "discount"
  | "quantity"
  | "images"
  | "status";

type CampaignSortState = {
  key: CampaignSortKey;
  direction: SortDirection;
};

type GenerateCampaignInput = {
  productId: string;
  discountPercent: number;
  quantityLimit: number;
  imageVariants: number;
  optionalInstructions?: string;
};

type CampaignGenerationState = {
  loading: boolean;
  error: string | null;
};

type AdditionalImageState = {
  open: boolean;
  loading: boolean;
  error: string | null;
  instructions: string;
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
  const [openRecommendationProductId, setOpenRecommendationProductId] =
    useState<string | null>(null);
  const [campaignDraft, setCampaignDraft] =
    useState<VoiceCampaignDraft>(createEmptyCampaignDraft());
  const campaignDraftRef = useRef(campaignDraft);
  const [campaignGenerationState, setCampaignGenerationState] =
    useState<CampaignGenerationState>({
      loading: false,
      error: null
    });
  const [additionalImageState, setAdditionalImageState] =
    useState<AdditionalImageState>({
      open: false,
      loading: false,
      error: null,
      instructions: ""
    });
  const [productSortState, setProductSortState] = useState<ProductSortState>({
    key: "name",
    direction: "asc"
  });
  const [campaignsByProduct, setCampaignsByProduct] = useState<
    Record<string, CampaignSummaryDto[]>
  >({});
  const [campaignDetailsById, setCampaignDetailsById] = useState<
    Record<string, CampaignDetailDto>
  >({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsDialogOpen, setSuggestionsDialogOpen] = useState(false);
  const [loadingHistoryProductId, setLoadingHistoryProductId] = useState<
    string | null
  >(null);
  const [loadingCampaignId, setLoadingCampaignId] = useState<string | null>(
    null
  );
  const [loggingOut, setLoggingOut] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.productId, product])),
    [products]
  );
  const selectedProduct = selectedProductId
    ? productsById.get(selectedProductId) ?? null
    : null;

  function replaceCampaignDraft(nextDraft: VoiceCampaignDraft) {
    campaignDraftRef.current = nextDraft;
    setCampaignDraft(nextDraft);
  }

  function updateCampaignDraft(patch: Partial<VoiceCampaignDraft>) {
    const nextDraft = applyCampaignDraftPatch(campaignDraftRef.current, patch);
    replaceCampaignDraft(nextDraft);
    return nextDraft;
  }
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
  const openRecommendationProduct = openRecommendationProductId
    ? products.find((product) => product.productId === openRecommendationProductId) ?? null
    : null;
  const openRecommendation = openRecommendationProductId
    ? opportunitiesByProductId.get(openRecommendationProductId) ?? null
    : null;

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

      return result.campaigns;
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

  async function handleLogout() {
    setAppError(null);
    setLoggingOut(true);
    try {
      await apiPost<{ ok: true }>("/api/auth/logout", {});
      setAuthState("unauthenticated");
      setUser(null);
      setOverview(null);
      setProducts([]);
      setView({ kind: "dashboard" });
      setSelectedProductId(null);
      setOpportunities([]);
      setOpenRecommendationProductId(null);
      setSuggestionsDialogOpen(false);
      replaceCampaignDraft(createEmptyCampaignDraft());
      setCampaignGenerationState({ loading: false, error: null });
      setAdditionalImageState({
        open: false,
        loading: false,
        error: null,
        instructions: ""
      });
      setProductSortState({ key: "name", direction: "asc" });
      setCampaignsByProduct({});
      setCampaignDetailsById({});
    } catch (error) {
      setAppError(toErrorMessage(error));
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleAskCodex() {
    setAppError(null);
    setOpportunities([]);
    setSuggestionsDialogOpen(true);
    setLoadingSuggestions(true);
    try {
      const result = await apiPost<{ opportunities: OpportunityDto[] }>(
        "/api/campaign-opportunities",
        {}
      );

      setOpportunities(result.opportunities);
      if (result.opportunities.length > 0) {
        setProductSortState({ key: "suggested", direction: "desc" });
      }
      if (!selectedProductId && result.opportunities[0]) {
        setSelectedProductId(result.opportunities[0].productId);
      }
    } catch (error) {
      setSuggestionsDialogOpen(false);
      setAppError(toErrorMessage(error));
    } finally {
      setLoadingSuggestions(false);
    }
  }

  function openProduct(productId: string) {
    setView({ kind: "product", productId });
    setSelectedProductId(productId);
    setOpenRecommendationProductId(null);
    setSuggestionsDialogOpen(false);
    setAdditionalImageState((current) => ({ ...current, open: false }));
    void loadCampaignHistory(productId).catch((error) => {
      setAppError(toErrorMessage(error));
    });
  }

  function openCampaignCreate(
    productId: string,
    suggestedOffer?: CampaignOfferDraft
  ) {
    setView({ kind: "campaign", productId, suggestedOffer });
    setSelectedProductId(productId);
    setOpenRecommendationProductId(null);
    setSuggestionsDialogOpen(false);
    replaceCampaignDraft(createCampaignDraft(suggestedOffer));
    setCampaignGenerationState({ loading: false, error: null });
    setAdditionalImageState({
      open: false,
      loading: false,
      error: null,
      instructions: ""
    });
  }

  function openExistingCampaign(productId: string, campaignId: string) {
    setView({ kind: "campaign", productId, campaignId });
    setSelectedProductId(productId);
    setOpenRecommendationProductId(null);
    setSuggestionsDialogOpen(false);
    setCampaignGenerationState({ loading: false, error: null });
    setAdditionalImageState({
      open: false,
      loading: false,
      error: null,
      instructions: ""
    });

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

  async function generateAdditionalImage(
    campaignId: string,
    customInstructions?: string
  ) {
    setAppError(null);
    const result = await apiPost<{ images: CampaignImageDto[] }>(
      `/api/campaigns/${encodeURIComponent(campaignId)}/images/generate`,
      {
        variants: 1,
        customInstructions
      }
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

  const currentProduct =
    view.kind === "product" || view.kind === "campaign"
      ? productsById.get(view.productId) ?? null
      : null;
  const currentCampaignDetail =
    view.kind === "campaign" && view.campaignId
      ? campaignDetailsById[view.campaignId] ?? null
      : null;
  const currentCampaigns = useMemo(
    () =>
      currentProduct
        ? campaignsByProduct[currentProduct.productId] ?? []
        : [],
    [campaignsByProduct, currentProduct]
  );

  async function submitCampaignDraft(): Promise<VoiceCommandResult> {
    if (view.kind !== "campaign" || !currentProduct || currentCampaignDetail) {
      const message = "Open a campaign create screen before generating.";
      setAppError(message);
      return voiceFailure(message, voiceContext);
    }

    const draftForGeneration = campaignDraftRef.current;
    const validationError = validateCampaignDraft(
      draftForGeneration,
      currentProduct
    );

    if (validationError) {
      setAppError(validationError);
      return voiceFailure(validationError, voiceContext);
    }

    setCampaignGenerationState({ loading: true, error: null });
    try {
      await generateCampaign({
        productId: currentProduct.productId,
        discountPercent: draftForGeneration.discountPercent,
        quantityLimit: draftForGeneration.quantityLimit,
        imageVariants: draftForGeneration.imageVariants,
        optionalInstructions: buildOptionalInstructions({
          aspectRatio: draftForGeneration.aspectRatio,
          customImagePrompt: draftForGeneration.customImagePrompt
        })
      });
    } catch (error) {
      setCampaignGenerationState({
        loading: false,
        error: toErrorMessage(error)
      });
      return voiceFailure(toErrorMessage(error), voiceContext);
    }

    setCampaignGenerationState({ loading: false, error: null });
    return voiceSuccess("Campaign created.", voiceContext);
  }

  function openAdditionalImageDialog() {
    if (!currentCampaignDetail) {
      setAppError("Open an existing campaign before generating another image.");
      return;
    }

    setAdditionalImageState({
      open: true,
      loading: false,
      error: null,
      instructions: ""
    });
  }

  async function submitAdditionalImage(
    customDirection?: string
  ): Promise<VoiceCommandResult> {
    if (!currentCampaignDetail) {
      const message = "Open an existing campaign before generating another image.";
      setAppError(message);
      return voiceFailure(message, voiceContext);
    }

    const instructions =
      customDirection ?? additionalImageState.instructions;

    setAdditionalImageState((current) => ({
      ...current,
      open: true,
      loading: true,
      error: null,
      instructions
    }));

    try {
      await generateAdditionalImage(
        currentCampaignDetail.campaign.campaignId,
        instructions
      );
    } catch (error) {
      setAdditionalImageState((current) => ({
        ...current,
        loading: false,
        error: toErrorMessage(error)
      }));
      return voiceFailure(toErrorMessage(error), voiceContext);
    }

    setAdditionalImageState({
      open: false,
      loading: false,
      error: null,
      instructions: ""
    });
    return voiceSuccess("Image generated.", voiceContext);
  }

  const voiceContext = useMemo(
    () =>
      buildVoiceScreenContext({
        page: view.kind,
        products,
        selectedProductId,
        opportunities,
        currentProductId: currentProduct?.productId ?? null,
        campaigns: currentCampaigns,
        currentCampaignDetail,
        campaignDraft: view.kind === "campaign" ? campaignDraft : null,
        activeDialog: getActiveVoiceDialog({
          suggestionsDialogOpen,
          openRecommendationProductId,
          campaignGenerationState,
          additionalImageState
        }),
        loading: {
          products: loadingProducts,
          suggestions: loadingSuggestions,
          historyProductId: loadingHistoryProductId,
          campaignId: loadingCampaignId,
          campaignGeneration: campaignGenerationState.loading,
          imageGeneration: additionalImageState.loading
        }
      }),
    [
      additionalImageState,
      campaignDraft,
      campaignGenerationState,
      currentCampaignDetail,
      currentCampaigns,
      currentProduct,
      loadingCampaignId,
      loadingHistoryProductId,
      loadingProducts,
      loadingSuggestions,
      openRecommendationProductId,
      opportunities,
      products,
      selectedProductId,
      suggestionsDialogOpen,
      view.kind
    ]
  );

  const closeActiveDialogForVoice = useCallback((): VoiceCommandResult => {
    const activeDialog = getActiveVoiceDialog({
      suggestionsDialogOpen,
      openRecommendationProductId,
      campaignGenerationState,
      additionalImageState
    });

    if (activeDialog === "campaign_generation" || additionalImageState.loading) {
      return voiceFailure(
        "A generation action is running, so the dialog cannot be closed yet.",
        voiceContext
      );
    }

    if (suggestionsDialogOpen) {
      setSuggestionsDialogOpen(false);
    }
    if (openRecommendationProductId) {
      setOpenRecommendationProductId(null);
    }
    if (additionalImageState.open) {
      setAdditionalImageState((current) => ({
        ...current,
        open: false,
        loading: false,
        error: null,
        instructions: ""
      }));
    }
    if (campaignGenerationState.error) {
      setCampaignGenerationState({ loading: false, error: null });
    }

    return activeDialog === "none"
      ? voiceFailure("There is no dialog open.", voiceContext)
      : voiceSuccess("Closed the dialog.", voiceContext);
  }, [
    additionalImageState,
    campaignGenerationState,
    openRecommendationProductId,
      suggestionsDialogOpen,
      voiceContext
    ]);

  function getLatestVoiceContext() {
    return view.kind === "campaign"
      ? {
          ...voiceContext,
          campaignDraft: campaignDraftRef.current
        }
      : voiceContext;
  }

  const voiceCommands: PromoWorkflowCommands = {
      getContext: getLatestVoiceContext,
      openProduct: async (reference) => {
        const resolution = resolveProductReference(
          voiceContext.products,
          reference
        );

        if (resolution.kind !== "matched") {
          return voiceFailure(
            formatProductResolutionFailure(reference, voiceContext.products),
            voiceContext
          );
        }

        openProduct(resolution.product.productId);

        return voiceSuccess(
          `Opened ${resolution.product.name}.`,
          voiceContext
        );
      },
      navigateBack: async () => {
        if (getActiveVoiceDialog({
          suggestionsDialogOpen,
          openRecommendationProductId,
          campaignGenerationState,
          additionalImageState
        }) !== "none") {
          return closeActiveDialogForVoice();
        }

        if (view.kind === "campaign" && currentProduct) {
          setView({ kind: "product", productId: currentProduct.productId });
          void loadCampaignHistory(currentProduct.productId).catch((error) =>
            setAppError(toErrorMessage(error))
          );
          return voiceSuccess("Returned to product details.", voiceContext);
        }

        if (view.kind === "product") {
          setView({ kind: "dashboard" });
          return voiceSuccess("Returned to products.", voiceContext);
        }

        return voiceFailure("You are already on the products dashboard.", voiceContext);
      },
      generatePromotionSuggestions: async () => {
        await handleAskCodex();
        return voiceSuccess("Promotion suggestions are ready.", voiceContext);
      },
      openRecommendation: async (reference) => {
        if (!opportunities.length) {
          return voiceFailure(
            "Generate promotion suggestions before opening a recommendation.",
            voiceContext
          );
        }

        const resolution = resolveProductReference(
          voiceContext.products,
          reference
        );

        if (resolution.kind !== "matched") {
          return voiceFailure(
            formatProductResolutionFailure(reference, voiceContext.products),
            voiceContext
          );
        }

        if (!opportunitiesByProductId.has(resolution.product.productId)) {
          return voiceFailure(
            `${resolution.product.name} is not currently recommended.`,
            voiceContext
          );
        }

        setSuggestionsDialogOpen(false);
        setOpenRecommendationProductId(resolution.product.productId);
        return voiceSuccess(
          `Opened the recommendation for ${resolution.product.name}.`,
          voiceContext
        );
      },
      createCampaignForProduct: async (reference) => {
        const productReference =
          reference ??
          openRecommendationProduct?.name ??
          currentProduct?.name ??
          selectedProduct?.name;

        if (!productReference) {
          return voiceFailure(
            "Select or name a product before creating a campaign.",
            voiceContext
          );
        }

        const resolution = resolveProductReference(
          voiceContext.products,
          productReference
        );

        if (resolution.kind !== "matched") {
          return voiceFailure(
            formatProductResolutionFailure(productReference, voiceContext.products),
            voiceContext
          );
        }

        const opportunity = opportunitiesByProductId.get(
          resolution.product.productId
        );
        openCampaignCreate(
          resolution.product.productId,
          opportunity
            ? {
                discountPercent: opportunity.recommendedDiscountPercent,
                quantityLimit: opportunity.recommendedQuantityLimit
              }
            : undefined
        );

        return voiceSuccess(
          `Opened campaign setup for ${resolution.product.name}.`,
          voiceContext
        );
      },
      openCampaign: async (productReference, campaignReference) => {
        const reference =
          productReference ?? currentProduct?.name ?? selectedProduct?.name;

        if (!reference) {
          return voiceFailure(
            "Open a product or name a product before opening a saved campaign.",
            voiceContext
          );
        }

        const productResolution = resolveProductReference(
          voiceContext.products,
          reference
        );

        if (productResolution.kind !== "matched") {
          return voiceFailure(
            formatProductResolutionFailure(reference, voiceContext.products),
            voiceContext
          );
        }

        let campaigns =
          campaignsByProduct[productResolution.product.productId] ?? null;

        if (!campaigns) {
          try {
            campaigns =
              (await loadCampaignHistory(productResolution.product.productId)) ??
              [];
          } catch (error) {
            return voiceFailure(toErrorMessage(error), voiceContext);
          }
        }

        const campaignResolution = resolveCampaignReference(
          campaigns,
          campaignReference
        );

        if (campaignResolution.kind !== "matched") {
          return voiceFailure(
            formatCampaignResolutionFailure(campaignReference, campaigns),
            voiceContext
          );
        }

        openExistingCampaign(
          productResolution.product.productId,
          campaignResolution.campaign.campaignId
        );

        return voiceSuccess("Opened the saved campaign.", voiceContext);
      },
      setCampaignOffer: async (draft) => {
        if (view.kind !== "campaign" || currentCampaignDetail) {
          return voiceFailure(
            "Open a campaign create screen before setting offer terms.",
            voiceContext
          );
        }

        const nextDraft = updateCampaignDraft(draft);
        return voiceSuccess("Updated the campaign offer.", {
          ...voiceContext,
          campaignDraft: nextDraft
        });
      },
      generateCampaign: async () => {
        return submitCampaignDraft();
      },
      openAdditionalImageDialog: async () => {
        if (!currentCampaignDetail) {
          return voiceFailure(
            "Open a generated campaign before creating another image.",
            voiceContext
          );
        }

        openAdditionalImageDialog();
        return voiceSuccess("Opened image direction dialog.", voiceContext);
      },
      generateAnotherImage: async (customDirection) => {
        if (!currentCampaignDetail) {
          return voiceFailure(
            "Open a generated campaign before creating another image.",
            voiceContext
          );
        }

        return submitAdditionalImage(customDirection);
      },
      closeDialog: async () => closeActiveDialogForVoice()
    };
  const voiceSession = useRealtimeVoiceSession(voiceCommands);

  if (authState === "checking") {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <LoaderCircle className="size-4 animate-spin text-blue-600" />
          Loading eCommerce Promotion Cockpit
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

  return (
    <main className="min-h-screen text-slate-950">
      <AppHeader
        user={user}
        loggingOut={loggingOut}
        onLogout={() => void handleLogout()}
      />

      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
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
            openRecommendationProductId={openRecommendationProductId}
            opportunitiesByProductId={opportunitiesByProductId}
            sortState={productSortState}
            loadingSuggestions={loadingSuggestions}
            onSelectProduct={setSelectedProductId}
            onOpenRecommendation={setOpenRecommendationProductId}
            onCloseRecommendation={() => setOpenRecommendationProductId(null)}
            onSortStateChange={setProductSortState}
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
            key={`${currentProduct.productId}:${view.campaignId ?? "new"}:${view.suggestedOffer?.discountPercent ?? 0}:${view.suggestedOffer?.quantityLimit ?? 0}`}
            product={currentProduct}
            campaignDetail={currentCampaignDetail}
            loadingCampaign={
              view.campaignId ? loadingCampaignId === view.campaignId : false
            }
            draft={campaignDraft}
            generationState={campaignGenerationState}
            additionalImageState={additionalImageState}
            onBack={() => {
              setView({ kind: "product", productId: currentProduct.productId });
              void loadCampaignHistory(currentProduct.productId).catch(
                (error) => setAppError(toErrorMessage(error))
              );
            }}
            onDraftChange={(draft) =>
              updateCampaignDraft(draft)
            }
            onGenerate={() => void submitCampaignDraft()}
            onClearGenerationError={() =>
              setCampaignGenerationState({ loading: false, error: null })
            }
            onOpenAdditionalImageDialog={openAdditionalImageDialog}
            onAdditionalImageInstructionsChange={(instructions) =>
              setAdditionalImageState((current) => ({
                ...current,
                instructions
              }))
            }
            onGenerateAnotherImage={() => void submitAdditionalImage()}
            onCloseAdditionalImageDialog={() => {
              if (!additionalImageState.loading) {
                setAdditionalImageState({
                  open: false,
                  loading: false,
                  error: null,
                  instructions: ""
                });
              }
            }}
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

      <PromotionSuggestionsDialog
        open={suggestionsDialogOpen}
        loading={loadingSuggestions}
        opportunities={opportunities}
        productsById={productsById}
        onClose={() => setSuggestionsDialogOpen(false)}
        onCreateCampaign={(productId, suggestedOffer) => {
          setSuggestionsDialogOpen(false);
          openCampaignCreate(productId, suggestedOffer);
        }}
      />

      <span className="sr-only">
        Signed in as {user?.email ?? "demo user"}
      </span>
      <VoiceModePanel session={voiceSession} />
    </main>
  );
}

function AppHeader({
  user,
  loggingOut,
  onLogout
}: {
  user: AuthenticatedUser | null;
  loggingOut: boolean;
  onLogout: () => void;
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex min-h-16 w-full max-w-[1480px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-950 text-white">
            <Tag className="size-5" />
          </div>
          <span className="truncate text-xl font-semibold text-slate-950">
            eCommerce Promotion Cockpit
          </span>
        </div>

        <div className="flex min-w-0 items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 gap-2 px-2"
                  disabled={loggingOut}
                />
              }
            >
              <Avatar>
                <AvatarFallback>{userInitials(user?.email)}</AvatarFallback>
              </Avatar>
              <ChevronsUpDown className="size-4 text-slate-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  {user?.email ?? "Demo account"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={loggingOut}
                  onClick={onLogout}
                >
                  {loggingOut ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <LogOut className="size-4" />
                  )}
                  Logout
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function VoiceModePanel({
  session
}: {
  session: ReturnType<typeof useRealtimeVoiceSession>;
}) {
  const active = session.connected || session.status === "connecting";
  const expanded = active || session.status === "error";
  const busy =
    session.status === "connecting" ||
    session.status === "thinking" ||
    session.status === "executing";
  const voiceActive =
    session.status === "listening" || session.status === "speaking";
  const statusLabel = getVoiceStatusLabel(session.status);
  const statusTone =
    session.status === "error"
      ? "bg-red-500"
      : busy
        ? "bg-blue-500"
        : "bg-green-500";

  if (!expanded) {
    return (
      <aside className="fixed bottom-5 right-5">
        <Button
          type="button"
          size="icon-lg"
          variant="default"
          className="rounded-full bg-blue-600 shadow-lg hover:bg-blue-700"
          onClick={() => void session.start()}
          aria-label="Start voice control"
        >
          <Mic />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="fixed bottom-5 right-5">
      <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-lg">
        <span
          className={cn(
            "size-2 rounded-full",
            statusTone,
            voiceActive && "animate-pulse motion-reduce:animate-none"
          )}
        />
        <span className="relative grid size-8 place-items-center rounded-full border border-slate-200 bg-white text-blue-600">
          {voiceActive ? (
            <span
              className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping motion-reduce:animate-none"
              aria-hidden
            />
          ) : null}
          {busy ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <Mic className="relative size-4" aria-hidden />
          )}
        </span>
        <span className="text-sm font-semibold text-slate-950">
          {statusLabel}
        </span>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          className="rounded-full"
          onClick={session.stop}
          aria-label="Stop voice control"
        >
          <Square />
        </Button>
      </div>
    </aside>
  );
}

function getVoiceStatusLabel(
  status: ReturnType<typeof useRealtimeVoiceSession>["status"]
) {
  switch (status) {
    case "connecting":
      return "Starting";
    case "listening":
      return "Listening";
    case "thinking":
      return "Thinking";
    case "speaking":
      return "Speaking";
    case "executing":
      return "Running";
    case "error":
      return "Error";
    default:
      return "Listening";
  }
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
      <Card className="w-full max-w-[420px]">
        <form onSubmit={(event) => void handleSubmit(event)}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-lg bg-blue-50 text-blue-700">
                <Wand2 className="size-5" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  eCommerce Promotion Cockpit
                </CardTitle>
                <CardDescription>
                  Sign in with the seeded demo account.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10"
                type="email"
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-10"
                type="password"
                autoComplete="current-password"
              />
            </div>

            <Button
              className="h-10 w-full bg-blue-600 hover:bg-blue-700"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              Sign in
            </Button>
          </CardContent>
        </form>
      </Card>
    </main>
  );
}

function DashboardView({
  loading,
  overview,
  products,
  selectedProductId,
  openRecommendationProductId,
  opportunitiesByProductId,
  sortState,
  loadingSuggestions,
  onSelectProduct,
  onOpenRecommendation,
  onCloseRecommendation,
  onSortStateChange,
  onOpenProduct,
  onAskCodex,
  onCreateCampaignForProduct,
  onCreateCampaign
}: {
  loading: boolean;
  overview: ProductOverview | null;
  products: ProductForCampaignReview[];
  selectedProductId: string | null;
  openRecommendationProductId: string | null;
  opportunitiesByProductId: Map<string, OpportunityDto>;
  sortState: ProductSortState;
  loadingSuggestions: boolean;
  onSelectProduct: (productId: string | null) => void;
  onOpenRecommendation: (productId: string) => void;
  onCloseRecommendation: () => void;
  onSortStateChange: (sortState: ProductSortState) => void;
  onOpenProduct: (productId: string) => void;
  onAskCodex: () => void;
  onCreateCampaignForProduct: (
    productId: string,
    suggestedOffer?: CampaignOfferDraft
  ) => void;
  onCreateCampaign: () => void;
}) {
  const suggestionRankByProductId = useMemo(() => {
    const ranks = new Map<string, number>();
    let index = 0;

    for (const productId of opportunitiesByProductId.keys()) {
      ranks.set(productId, index);
      index += 1;
    }

    return ranks;
  }, [opportunitiesByProductId]);

  const sortedProducts = useMemo(
    () =>
      [...products].sort((firstProduct, secondProduct) =>
        compareProducts(
          firstProduct,
          secondProduct,
          sortState,
          opportunitiesByProductId,
          suggestionRankByProductId
        )
      ),
    [opportunitiesByProductId, products, sortState, suggestionRankByProductId]
  );

  const openRecommendationProduct = openRecommendationProductId
    ? products.find((product) => product.productId === openRecommendationProductId) ?? null
    : null;
  const openRecommendation = openRecommendationProductId
    ? opportunitiesByProductId.get(openRecommendationProductId) ?? null
    : null;

  function handleSort(key: ProductSortKey) {
    onSortStateChange({
      key,
      direction:
        sortState.key === key && sortState.direction === "asc" ? "desc" : "asc"
    });
  }

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

        <Table className="min-w-[920px]">
          <TableHeader>
            <TableRow className="text-xs font-semibold uppercase text-slate-500">
              <TableHead className="w-[88px] px-5 py-3">Select</TableHead>
                <SortableTableHeader
                  label="Product"
                  active={sortState.key === "name"}
                  direction={sortState.direction}
                  onSort={() => handleSort("name")}
                />
                <SortableTableHeader
                  label="Category"
                  active={sortState.key === "category"}
                  direction={sortState.direction}
                  onSort={() => handleSort("category")}
                />
                <SortableTableHeader
                  label="Price"
                  active={sortState.key === "price"}
                  direction={sortState.direction}
                  onSort={() => handleSort("price")}
                />
                <SortableTableHeader
                  label="Available"
                  active={sortState.key === "available"}
                  direction={sortState.direction}
                  onSort={() => handleSort("available")}
                />
                <SortableTableHeader
                  label="Sold this month"
                  active={sortState.key === "sold"}
                  direction={sortState.direction}
                  onSort={() => handleSort("sold")}
                />
                <SortableTableHeader
                  label="Suggested"
                  active={sortState.key === "suggested"}
                  direction={sortState.direction}
                  onSort={() => handleSort("suggested")}
                />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProducts.map((product) => {
              const selected = selectedProductId === product.productId;
              const recommendation = opportunitiesByProductId.get(
                product.productId
              );
              const suggested = Boolean(recommendation);

              return (
                <TableRow
                  key={product.productId}
                  onClick={() => onOpenProduct(product.productId)}
                  className={cn(
                    "cursor-pointer text-sm",
                    selected && "bg-blue-50/70",
                    suggested && !selected && "bg-sky-50/45"
                  )}
                >
                  <TableCell className="px-5 py-4">
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
                  </TableCell>
                  <TableCell className="px-5 py-4">
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
                  </TableCell>
                  <TableCell className="px-5 py-4 text-slate-600">
                    {product.category}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    {formatCents(product.priceCents)}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    {numberFormat.format(product.availableQuantity)}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    {numberFormat.format(product.unitsSoldThisMonth)}
                  </TableCell>
                  <TableCell
                    className="px-5 py-4"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {recommendation ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                        aria-haspopup="dialog"
                        onClick={() => onOpenRecommendation(product.productId)}
                      >
                        <Sparkles className="size-3.5" />
                        View recommendation
                      </Button>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

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

      {openRecommendationProduct && openRecommendation ? (
        <RecommendationDialog
          product={openRecommendationProduct}
          opportunity={openRecommendation}
          onCreateCampaign={() => {
            onCloseRecommendation();
            onCreateCampaignForProduct(openRecommendationProduct.productId, {
              discountPercent: openRecommendation.recommendedDiscountPercent,
              quantityLimit: openRecommendation.recommendedQuantityLimit
            });
          }}
          onClose={onCloseRecommendation}
        />
      ) : null}
    </>
  );
}

function RecommendationDialog({
  product,
  opportunity,
  onCreateCampaign,
  onClose
}: {
  product: ProductForCampaignReview;
  opportunity: OpportunityDto;
  onCreateCampaign: (suggestedOffer: CampaignOfferDraft) => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>AI recommendation</DialogTitle>
          <DialogDescription>
            {product.name} · {product.category}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
          <Fact
            label="Available"
            value={`${numberFormat.format(product.availableQuantity)} units`}
          />
          <Fact
            label="Sold this month"
            value={`${numberFormat.format(product.unitsSoldThisMonth)} units`}
          />
          <div>
            <p className="text-sm font-medium text-slate-500">Confidence</p>
            <div className="mt-2">
              <StatusPill tone={confidenceTone(opportunity.confidence)}>
                {opportunity.confidence}
              </StatusPill>
            </div>
          </div>
        </div>

        <p className="text-sm leading-6 text-slate-700">
          <span className="font-medium text-slate-800">Why picked:</span>{" "}
          {opportunity.reasoning}
        </p>

        <div className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-2">
          <Fact
            label="Recommended discount"
            value={`${opportunity.recommendedDiscountPercent}%`}
          />
          <Fact
            label="Quantity limit"
            value={`${numberFormat.format(opportunity.recommendedQuantityLimit)} units`}
          />
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Close
          </DialogClose>
          <Button
            type="button"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() =>
              onCreateCampaign({
                discountPercent: opportunity.recommendedDiscountPercent,
                quantityLimit: opportunity.recommendedQuantityLimit
              })
            }
          >
            <Plus className="size-4" />
            Create campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PromotionSuggestionsDialog({
  open,
  loading,
  opportunities,
  productsById,
  onCreateCampaign,
  onClose
}: {
  open: boolean;
  loading: boolean;
  opportunities: OpportunityDto[];
  productsById: Map<string, ProductForCampaignReview>;
  onCreateCampaign: (
    productId: string,
    suggestedOffer: CampaignOfferDraft
  ) => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !loading) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[720px]" showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle>Promotion suggestions</DialogTitle>
          <DialogDescription>
            Products Codex recommends for campaign attention.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <LoadingPanel label="Generating promotion suggestions" />
        ) : opportunities.length > 0 ? (
          <ScrollArea className="max-h-[460px]">
            <div className="flex flex-col gap-3 pr-3">
              {opportunities.map((opportunity, index) => {
                const product = productsById.get(opportunity.productId);
                const productName = product?.name ?? opportunity.sku;
                const productCategory = product?.category ?? "Product";

                return (
                  <article
                    key={`${opportunity.productId}-${opportunity.sku}`}
                    className="rounded-lg border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Suggestion {index + 1}
                        </p>
                        <h3 className="mt-1 text-base font-semibold text-slate-950">
                          {productName}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {productCategory} · {opportunity.sku}
                        </p>
                      </div>
                      <StatusPill tone={confidenceTone(opportunity.confidence)}>
                        {opportunity.confidence}
                      </StatusPill>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {opportunity.reasoning}
                    </p>

                    <div className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
                      <Fact
                        label="Recommended discount"
                        value={`${opportunity.recommendedDiscountPercent}%`}
                      />
                      <Fact
                        label="Quantity limit"
                        value={`${numberFormat.format(opportunity.recommendedQuantityLimit)} units`}
                      />
                    </div>

                    <div className="mt-4 flex justify-end">
                      <Button
                        type="button"
                        className="h-9 bg-blue-600 hover:bg-blue-700"
                        onClick={() =>
                          onCreateCampaign(opportunity.productId, {
                            discountPercent:
                              opportunity.recommendedDiscountPercent,
                            quantityLimit:
                              opportunity.recommendedQuantityLimit
                          })
                        }
                      >
                        <Plus className="size-4" />
                        Create campaign
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
            No promotion suggestions were returned.
          </div>
        )}

        {!loading ? (
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Close
            </DialogClose>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
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
  const [sortState, setSortState] = useState<CampaignSortState>({
    key: "created",
    direction: "desc"
  });
  const sortedCampaigns = useMemo(
    () =>
      [...campaigns].sort((firstCampaign, secondCampaign) =>
        compareCampaigns(firstCampaign, secondCampaign, sortState)
      ),
    [campaigns, sortState]
  );

  function handleSort(key: CampaignSortKey) {
    setSortState((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  }

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

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-6">
          <ProductSummaryItem
            icon={<Package className="size-5" />}
            label="SKU"
            value={product.sku}
            className="xl:col-span-2"
          />
          <ProductSummaryItem
            icon={<Boxes className="size-5" />}
            label="Category"
            value={product.category}
          />
          <ProductSummaryItem
            icon={<Tag className="size-5" />}
            label="Unit price"
            value={formatCents(product.priceCents)}
          />
          <ProductSummaryItem
            icon={<Package className="size-5" />}
            label="Available stock"
            value={`${numberFormat.format(product.availableQuantity)} units`}
          />
          <ProductSummaryItem
            icon={<TrendingUp className="size-5" />}
            label="Sold this month"
            value={`${numberFormat.format(product.unitsSoldThisMonth)} units`}
          />
        </dl>
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
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow className="text-xs font-semibold text-slate-500">
                <SortableTableHeader
                  label="Created"
                  active={sortState.key === "created"}
                  direction={sortState.direction}
                  onSort={() => handleSort("created")}
                />
                <SortableTableHeader
                  label="Discount"
                  active={sortState.key === "discount"}
                  direction={sortState.direction}
                  onSort={() => handleSort("discount")}
                />
                <SortableTableHeader
                  label="Quantity limit"
                  active={sortState.key === "quantity"}
                  direction={sortState.direction}
                  onSort={() => handleSort("quantity")}
                />
                <SortableTableHeader
                  label="Images"
                  active={sortState.key === "images"}
                  direction={sortState.direction}
                  onSort={() => handleSort("images")}
                />
                <SortableTableHeader
                  label="Caption status"
                  active={sortState.key === "status"}
                  direction={sortState.direction}
                  onSort={() => handleSort("status")}
                />
                <TableHead className="px-5 py-3">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCampaigns.map((campaign) => (
                <TableRow
                  key={campaign.campaignId}
                  onClick={() => onViewCampaign(campaign.campaignId)}
                  className="cursor-pointer text-sm"
                >
                  <TableCell className="px-5 py-4">
                    {formatDateTime(campaign.createdAt)}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <StatusPill tone="blue">
                      {campaign.discountPercent}% OFF
                    </StatusPill>
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    {numberFormat.format(campaign.quantityLimit)} units
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    {numberFormat.format(campaign.imageCount)} generated
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <span className="inline-flex items-center gap-2 text-slate-700">
                      <CheckCircle2 className="size-4 text-green-600" />
                      Completed
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
  draft,
  generationState,
  additionalImageState,
  onBack,
  onDraftChange,
  onGenerate,
  onClearGenerationError,
  onOpenAdditionalImageDialog,
  onAdditionalImageInstructionsChange,
  onGenerateAnotherImage,
  onCloseAdditionalImageDialog,
  onError
}: {
  product: ProductForCampaignReview;
  campaignDetail: CampaignDetailDto | null;
  loadingCampaign: boolean;
  draft: VoiceCampaignDraft;
  generationState: CampaignGenerationState;
  additionalImageState: AdditionalImageState;
  onBack: () => void;
  onDraftChange: (draft: Partial<VoiceCampaignDraft>) => void;
  onGenerate: () => void;
  onClearGenerationError: () => void;
  onOpenAdditionalImageDialog: () => void;
  onAdditionalImageInstructionsChange: (instructions: string) => void;
  onGenerateAnotherImage: () => void;
  onCloseAdditionalImageDialog: () => void;
  onError: (message: string) => void;
}) {
  const [previewImage, setPreviewImage] = useState<CampaignImageDto | null>(
    null
  );

  const readOnly = Boolean(campaignDetail) || loadingCampaign;
  const displayedDiscountPercent =
    campaignDetail?.campaign.discountPercent ?? draft.discountPercent;
  const displayedQuantityLimit =
    campaignDetail?.campaign.quantityLimit ?? draft.quantityLimit;
  const displayedImageVariants =
    campaignDetail?.campaign.initialImageVariantsRequested ??
    draft.imageVariants;
  const displayedAspectRatio = campaignDetail
    ? extractAspectRatio(campaignDetail.campaign.optionalInstructions) ??
      "Square"
    : draft.aspectRatio;
  const displayedCustomImagePrompt = campaignDetail
    ? extractCustomImagePrompt(campaignDetail.campaign.optionalInstructions)
    : draft.customImagePrompt;
  const validQuantity =
    draft.quantityLimit >= 1 && draft.quantityLimit <= product.availableQuantity;
  const validDiscount =
    draft.discountPercent >= 1 && draft.discountPercent <= 100;
  const quantityExceedsStock = draft.quantityLimit > product.availableQuantity;
  const canGenerate =
    !readOnly && validQuantity && validDiscount && draft.imageVariants >= 1;

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canGenerate) {
      onError("Enter a discount and quantity limit before generating.");
      return;
    }

    onGenerate();
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
                disabled={readOnly || generationState.loading}
                onChange={(discountPercent) =>
                  onDraftChange({ discountPercent })
                }
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Quantity limit"
                  suffix="units"
                  min={0}
                  max={product.availableQuantity}
                  value={displayedQuantityLimit}
                  disabled={readOnly || generationState.loading}
                  onChange={(quantityLimit) => onDraftChange({ quantityLimit })}
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
                        disabled={readOnly || generationState.loading}
                        onClick={() =>
                          onDraftChange({
                            imageVariants: variantCount as VoiceCampaignDraft["imageVariants"]
                          })
                        }
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
                    disabled={readOnly || generationState.loading}
                    onClick={() => onDraftChange({ aspectRatio: option })}
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
            <Textarea
              className="min-h-[84px] resize-y"
              maxLength={500}
              value={displayedCustomImagePrompt}
              disabled={readOnly || generationState.loading}
              placeholder="Add a design direction for the campaign image..."
              onChange={(event) =>
                onDraftChange({ customImagePrompt: event.target.value })
              }
            />
            <span className="mt-1 block text-right text-xs text-slate-500">
              {displayedCustomImagePrompt.length} / 500
            </span>
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            type="submit"
            className="h-10 bg-blue-600 px-6 hover:bg-blue-700"
            disabled={!canGenerate || generationState.loading}
          >
            {generationState.loading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {generationState.loading ? "Generating campaign" : "Generate"}
          </Button>
        </div>

        {quantityExceedsStock ? (
          <p className="mt-3 text-sm text-red-700">
            Quantity limit cannot exceed available stock.
          </p>
        ) : null}
      </form>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">
          Campaign details
        </h2>
        {loadingCampaign ? (
          <LoadingPanel label="Loading campaign" />
        ) : campaignDetail ? (
          <>
            <div className="overflow-hidden rounded-lg border border-slate-200">
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
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold text-slate-950">
                  Campaign creative
                </h3>
                <Button
                  type="button"
                  className="h-9 self-start bg-blue-600 hover:bg-blue-700 sm:self-auto"
                  onClick={onOpenAdditionalImageDialog}
                  disabled={additionalImageState.loading}
                >
                  <RefreshCcw className="size-4" />
                  Generate image
                </Button>
              </div>
              <ScrollArea className="max-h-[420px] rounded-lg border border-slate-200 bg-slate-50/60">
                <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {campaignDetail.images.map((image) => {
                    const imageSrc = campaignImageSrc(image);

                    return (
                      <button
                        key={image.imageId}
                        type="button"
                        className="group overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm transition hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-3 focus:ring-blue-100"
                        onClick={() => setPreviewImage(image)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- Protected campaign-image route should render with the browser session cookie. */}
                        <img
                          src={imageSrc}
                          alt={`Campaign creative for ${product.name}`}
                          className="aspect-square w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                        />
                        <span className="sr-only">
                          Open campaign creative preview
                        </span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            <AdditionalImageDialog
              open={additionalImageState.open}
              loading={additionalImageState.loading}
              error={additionalImageState.error}
              value={additionalImageState.instructions}
              onValueChange={onAdditionalImageInstructionsChange}
              onGenerate={onGenerateAnotherImage}
              onClose={onCloseAdditionalImageDialog}
            />

            <Dialog
              open={Boolean(previewImage)}
              onOpenChange={(open) => {
                if (!open) {
                  setPreviewImage(null);
                }
              }}
            >
              <DialogContent className="max-w-[min(92vw,980px)] p-3 sm:p-4">
                <DialogHeader className="sr-only">
                  <DialogTitle>Campaign creative preview</DialogTitle>
                </DialogHeader>
                {previewImage ? (
                  <div className="overflow-hidden rounded-lg bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Protected campaign-image route should render with the browser session cookie. */}
                    <img
                      src={campaignImageSrc(previewImage)}
                      alt={`Campaign creative preview for ${product.name}`}
                      className="max-h-[82vh] w-full object-contain"
                    />
                  </div>
                ) : null}
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 px-5 py-10 text-sm text-slate-500">
            Generated copy, image prompt, and campaign creative will appear here
            after the campaign is created.
          </div>
        )}
      </section>

      <WorkStatusDialog
        open={generationState.loading || Boolean(generationState.error)}
        loading={generationState.loading}
        title={
          generationState.error ? "Campaign was not created" : "Creating campaign"
        }
        description="Generating campaign copy and campaign creative."
        loadingLabel="Creating campaign"
        error={generationState.error}
        onClose={onClearGenerationError}
      />
    </>
  );
}

function WorkStatusDialog({
  open,
  loading,
  title,
  description,
  loadingLabel,
  error,
  onClose
}: {
  open: boolean;
  loading: boolean;
  title: string;
  description: string;
  loadingLabel: string;
  error: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !loading) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[460px]" showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <LoadingPanel label={loadingLabel} />
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {!loading ? (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function AdditionalImageDialog({
  open,
  loading,
  error,
  value,
  onValueChange,
  onGenerate,
  onClose
}: {
  open: boolean;
  loading: boolean;
  error: string | null;
  value: string;
  onValueChange: (value: string) => void;
  onGenerate: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !loading) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[520px]" showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle>
            {loading ? "Generating image" : "Generate another image"}
          </DialogTitle>
          <DialogDescription>
            {loading
              ? "Creating a new campaign creative variant."
              : "Add optional creative direction for this new image."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <LoadingPanel label="Generating image" />
        ) : (
          <>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">
                Custom image direction
              </span>
              <Textarea
                className="min-h-[112px] resize-y"
                maxLength={500}
                value={value}
                placeholder="Make it warmer, more premium, use a darker background..."
                onChange={(event) => onValueChange(event.target.value)}
              />
              <span className="text-right text-xs text-slate-500">
                {value.length} / 500
              </span>
            </label>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {error ? "Close" : "Cancel"}
              </Button>
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={onGenerate}
              >
                <Sparkles className="size-4" />
                Generate image
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
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

function SortableTableHeader({
  label,
  active,
  direction,
  onSort
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onSort: () => void;
}) {
  const Icon = !active
    ? ArrowUpDown
    : direction === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <TableHead className="px-5 py-3">
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1.5 text-left transition hover:text-slate-950",
          active ? "text-slate-950" : "text-slate-500"
        )}
        onClick={onSort}
      >
        <span>{label}</span>
        <Icon className="size-3.5" />
      </button>
    </TableHead>
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

function ProductSummaryItem({
  icon,
  label,
  value,
  className
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
        {icon}
      </div>
      <div className="min-w-0">
        <dt className="text-sm text-slate-500">{label}</dt>
        <dd className="mt-1 break-words font-semibold text-slate-950">
          {value}
        </dd>
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
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(toInteger(event.target.value))}
        className="h-2 w-full cursor-pointer accent-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
      />
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>0%</span>
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
}) {
  const parts = [
    `Image aspect ratio preference: ${input.aspectRatio}.`,
    input.customImagePrompt.trim()
      ? `Custom image prompt: ${input.customImagePrompt.trim()}`
      : ""
  ].filter(Boolean);

  return parts.join("\n").slice(0, 1000);
}

function createEmptyCampaignDraft(): VoiceCampaignDraft {
  return {
    discountPercent: 0,
    quantityLimit: 0,
    imageVariants: 2,
    aspectRatio: "Square",
    customImagePrompt: ""
  };
}

function createCampaignDraft(
  suggestedOffer?: CampaignOfferDraft
): VoiceCampaignDraft {
  return {
    ...createEmptyCampaignDraft(),
    discountPercent: suggestedOffer?.discountPercent ?? 0,
    quantityLimit: suggestedOffer?.quantityLimit ?? 0
  };
}

function validateCampaignDraft(
  draft: VoiceCampaignDraft,
  product: ProductForCampaignReview
) {
  if (draft.discountPercent < 1 || draft.discountPercent > 100) {
    return "Discount percent must be between 1 and 100.";
  }

  if (draft.quantityLimit < 1) {
    return "Quantity limit must be at least 1 unit.";
  }

  if (draft.quantityLimit > product.availableQuantity) {
    return "Quantity limit cannot exceed available stock.";
  }

  if (draft.imageVariants !== 1 && draft.imageVariants !== 2) {
    return "Image variants must be 1 or 2.";
  }

  return null;
}

function getActiveVoiceDialog(input: {
  suggestionsDialogOpen: boolean;
  openRecommendationProductId: string | null;
  campaignGenerationState: CampaignGenerationState;
  additionalImageState: AdditionalImageState;
}): VoiceActiveDialog {
  if (input.campaignGenerationState.loading || input.campaignGenerationState.error) {
    return "campaign_generation";
  }

  if (input.additionalImageState.open) {
    return "additional_image";
  }

  if (input.openRecommendationProductId) {
    return "recommendation";
  }

  if (input.suggestionsDialogOpen) {
    return "promotion_suggestions";
  }

  return "none";
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

function campaignImageSrc(image: CampaignImageDto) {
  return image.imageUrl;
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

function compareProducts(
  firstProduct: ProductForCampaignReview,
  secondProduct: ProductForCampaignReview,
  sortState: ProductSortState,
  opportunitiesByProductId: Map<string, OpportunityDto>,
  suggestionRankByProductId: Map<string, number>
) {
  let comparison = 0;

  if (sortState.key === "suggested") {
    const firstSuggested = opportunitiesByProductId.has(firstProduct.productId);
    const secondSuggested = opportunitiesByProductId.has(
      secondProduct.productId
    );
    const suggestedComparison =
      Number(firstSuggested) - Number(secondSuggested);

    if (suggestedComparison !== 0) {
      return applySortDirection(suggestedComparison, sortState.direction);
    }

    if (firstSuggested && secondSuggested) {
      comparison =
        (suggestionRankByProductId.get(firstProduct.productId) ??
          Number.MAX_SAFE_INTEGER) -
        (suggestionRankByProductId.get(secondProduct.productId) ??
          Number.MAX_SAFE_INTEGER);
    }
  } else {
    switch (sortState.key) {
      case "name":
        comparison = compareText(firstProduct.name, secondProduct.name);
        break;
      case "category":
        comparison = compareText(firstProduct.category, secondProduct.category);
        break;
      case "price":
        comparison = firstProduct.priceCents - secondProduct.priceCents;
        break;
      case "available":
        comparison =
          firstProduct.availableQuantity - secondProduct.availableQuantity;
        break;
      case "sold":
        comparison =
          firstProduct.unitsSoldThisMonth - secondProduct.unitsSoldThisMonth;
        break;
    }
  }

  if (comparison !== 0) {
    return applySortDirection(comparison, sortState.direction);
  }

  return compareText(firstProduct.name, secondProduct.name);
}

function compareCampaigns(
  firstCampaign: CampaignSummaryDto,
  secondCampaign: CampaignSummaryDto,
  sortState: CampaignSortState
) {
  let comparison = 0;

  switch (sortState.key) {
    case "created":
      comparison =
        Date.parse(firstCampaign.createdAt) - Date.parse(secondCampaign.createdAt);
      break;
    case "discount":
      comparison =
        firstCampaign.discountPercent - secondCampaign.discountPercent;
      break;
    case "quantity":
      comparison = firstCampaign.quantityLimit - secondCampaign.quantityLimit;
      break;
    case "images":
      comparison = firstCampaign.imageCount - secondCampaign.imageCount;
      break;
    case "status":
      comparison = 0;
      break;
  }

  if (comparison !== 0) {
    return applySortDirection(comparison, sortState.direction);
  }

  return Date.parse(secondCampaign.createdAt) - Date.parse(firstCampaign.createdAt);
}

function compareText(firstValue: string, secondValue: string) {
  return firstValue.localeCompare(secondValue, undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function applySortDirection(comparison: number, direction: SortDirection) {
  return direction === "asc" ? comparison : -comparison;
}

function userInitials(email: string | undefined) {
  if (!email) {
    return "DU";
  }

  const [name] = email.split("@");
  const parts = name.split(/[._-]+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "DU";
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
