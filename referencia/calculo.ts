export type OrderStatus = "draft" | "sent" | "approved" | "rejected";

/** Configuracao operacional que vive em cada orcamento. */
export type OrderConfig = {
  machine_kwh: number;
  kwh_price: number;
  machine_price: number;
  machine_lifetime_hours: number;

  failure_rate: number;
  profit_multiplier: number;

  packaging_cost: number;
  marketplace_fee: number;
  shipping_cost: number;
  finishing_cost: number;
  extra_fixed_cost: number;
};

export type Order = OrderConfig & {
  id: string;
  user_id: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  description: string | null;
  status: OrderStatus;

  total_material_cost: number;
  total_energy_cost: number;
  total_depreciation_cost: number;
  total_production_cost: number;
  suggested_price: number;

  created_at: string;
  updated_at: string;
};

/** Order com agregados usados no listing */
export type OrderSummary = Order & {
  item_count: number;
  total_suggested: number;
  item_names_summary: string;
};

export type FilamentInput = {
  filament_type: string;
  color: string | null;
  price_per_kg: number;
  weight_g: number;
};

export type FilamentRecord = FilamentInput & {
  id: string;
  order_item_id: string;
  material_cost: number;
  created_at?: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  user_id: string;

  name: string;
  notes: string | null;
  print_time_hours: number;
  quantity: number;

  material_cost: number;
  energy_cost: number;
  depreciation_cost: number;
  total_cost: number;

  created_at: string;
  updated_at: string;

  filaments?: FilamentRecord[];
};

export type OrderItemInput = {
  name: string;
  notes: string | null;
  print_time_hours: number;
  quantity: number;
  filaments: FilamentInput[];
};

/** Item temporario em memoria antes do save do orcamento. */
export type LocalOrderItem = {
  /** id local (uuid v4) ou id real do banco se ja persistido */
  id: string;
  /** true se ainda nao existe no banco (novo); false se ja existe */
  isNew: boolean;
  input: OrderItemInput;
  material_cost: number;
  energy_cost: number;
  depreciation_cost: number;
  total_cost: number;
};

export type ItemCostResult = {
  material_cost: number;
  energy_cost: number;
  depreciation_cost: number;
  total_cost: number;
};

export type OrderTotalsResult = {
  total_material_cost: number;
  total_energy_cost: number;
  total_depreciation_cost: number;
  sum_raw: number;
  after_failure: number;
  logistics: number;
  price_before_fee: number;
  total_production_cost: number;
  suggested_price: number;
};

export const DEFAULT_ORDER_CONFIG: OrderConfig = {
  machine_kwh: 0.15,
  kwh_price: 0.85,
  machine_price: 3500,
  machine_lifetime_hours: 5000,
  failure_rate: 0.15,
  profit_multiplier: 2.5,
  packaging_cost: 0,
  marketplace_fee: 0,
  shipping_cost: 0,
  finishing_cost: 0,
  extra_fixed_cost: 0,
};

export const FILAMENT_TYPES = [
  "PLA",
  "PETG",
  "ABS",
  "ASA",
  "TPU",
  "Flex",
] as const;


  /** Custo por filamento (sem multiplicar pela quantidade da peca). */
  export function filamentMaterialCost(f: FilamentInput): number {
    return (f.price_per_kg / 1000) * f.weight_g;
  }
  
  /** Calculo de custos brutos de uma peca (multiplicado pela qty). */
  export function calculateItem(
    config: OrderConfig,
    filaments: FilamentInput[],
    printTimeHours: number,
    quantity: number,
  ): ItemCostResult {
    const qty = Math.max(1, quantity || 1);
  
    const materialPerUnit = filaments.reduce(
      (sum, f) => sum + filamentMaterialCost(f),
      0,
    );
    const energyPerUnit = config.machine_kwh * config.kwh_price * printTimeHours;
    const depreciationPerUnit =
      config.machine_lifetime_hours > 0
        ? (config.machine_price / config.machine_lifetime_hours) * printTimeHours
        : 0;
  
    const material_cost = materialPerUnit * qty;
    const energy_cost = energyPerUnit * qty;
    const depreciation_cost = depreciationPerUnit * qty;
    const total_cost = material_cost + energy_cost + depreciation_cost;
  
    return { material_cost, energy_cost, depreciation_cost, total_cost };
  }
  
  /** Totaliza um orcamento a partir dos custos de seus itens + config. */
  export function calculateOrderTotals(
    config: OrderConfig,
    items: ItemCostResult[],
  ): OrderTotalsResult {
    const total_material_cost = items.reduce((s, i) => s + i.material_cost, 0);
    const total_energy_cost = items.reduce((s, i) => s + i.energy_cost, 0);
    const total_depreciation_cost = items.reduce(
      (s, i) => s + i.depreciation_cost,
      0,
    );
    const sum_raw = items.reduce((s, i) => s + i.total_cost, 0);
  
    const after_failure = sum_raw * (1 + (config.failure_rate || 0));
  
    const logistics =
      (config.packaging_cost || 0) +
      (config.shipping_cost || 0) +
      (config.finishing_cost || 0) +
      (config.extra_fixed_cost || 0);
  
    const price_before_fee =
      (after_failure + logistics) * (config.profit_multiplier || 1);
  
    const fee = Math.min(Math.max(config.marketplace_fee || 0, 0), 0.95);
    const suggested_price =
      fee > 0 ? price_before_fee / (1 - fee) : price_before_fee;
  
    const marketplace_cost = suggested_price - price_before_fee;
    const total_production_cost = after_failure + logistics + marketplace_cost;
  
    return {
      total_material_cost,
      total_energy_cost,
      total_depreciation_cost,
      sum_raw,
      after_failure,
      logistics,
      price_before_fee,
      total_production_cost,
      suggested_price,
    };
  }
  
  export const brl = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  