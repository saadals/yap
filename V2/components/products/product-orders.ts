import { orderItems } from "@/components/brand-home/order-items";
import type { DemoState } from "@/lib/store";

/** Orders for a product, counted as the product page lists them (a hired request is its job). */
export function productOrders(s: DemoState, productId: string) {
  return orderItems(s).filter((item) => {
    const brief = item.kind === "job" ? item.commission.brief : item.kind === "draft" ? item.request?.brief : item.request.brief;
    return brief?.productId === productId;
  });
}
