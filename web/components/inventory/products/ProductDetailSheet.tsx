'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import type { ProductWithCategory } from '@/types/inventory';

interface ProductDetailSheetProps {
  product: ProductWithCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (product: ProductWithCategory) => void;
  onDelete?: (product: ProductWithCategory) => void;
}

export default function ProductDetailSheet({
  product,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: ProductDetailSheetProps) {
  if (!product) return null;

  const formatCurrency = (value: any) => {
    if (value === null || value === undefined) return 'N/A';
    const numValue =
      typeof value === 'string'
        ? parseFloat(value)
        : typeof value === 'number'
          ? value
          : Number(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numValue);
  };

  const formatNumber = (value: any) => {
    if (value === null || value === undefined) return 'N/A';
    return typeof value === 'string' ? value : String(value);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-2xl">{product.name}</SheetTitle>
          <SheetDescription>Product Details</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 p-3">
          {/* Status and Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Badge variant={product.isActive ? 'default' : 'secondary'}>
                {product.isActive ? 'Active' : 'Inactive'}
              </Badge>
              {product.isService && <Badge variant="outline">Service</Badge>}
              {product.allowNegative && (
                <Badge variant="outline">Negative Stock Allowed</Badge>
              )}
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(product)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(product)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Image */}
          {product.image && (
            <div className="overflow-hidden rounded-lg border">
              <img
                src={product.image}
                alt={product.name}
                className="h-48 w-full object-cover"
              />
            </div>
          )}

          {/* Basic Information */}
          <div>
            <h3 className="mb-3 text-lg font-semibold">Basic Information</h3>
            <div className="space-y-2">
              {product.description && (
                <InfoRow label="Description" value={product.description} />
              )}
              <InfoRow label="SKU" value={product.sku} />
              {product.barcode && (
                <InfoRow label="Barcode" value={product.barcode} />
              )}
              {product.category && (
                <InfoRow label="Category" value={product.category.name} />
              )}
            </div>
          </div>

          <Separator />

          {/* Specifications */}
          {(product.brand ||
            product.model ||
            product.color ||
            product.size ||
            product.weight ||
            product.dimensions) && (
            <>
              <div>
                <h3 className="mb-3 text-lg font-semibold">Specifications</h3>
                <div className="space-y-2">
                  {product.brand && (
                    <InfoRow label="Brand" value={product.brand} />
                  )}
                  {product.model && (
                    <InfoRow label="Model" value={product.model} />
                  )}
                  {product.color && (
                    <InfoRow label="Color" value={product.color} />
                  )}
                  {product.size && (
                    <InfoRow label="Size" value={product.size} />
                  )}
                  {product.weight && (
                    <InfoRow
                      label="Weight"
                      value={`${formatNumber(product.weight)} kg`}
                    />
                  )}
                  {product.dimensions && (
                    <InfoRow label="Dimensions" value={product.dimensions} />
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Units */}
          <div>
            <h3 className="mb-3 text-lg font-semibold">Units</h3>
            <div className="space-y-2">
              <InfoRow label="Primary Unit" value={product.unit} />
              {product.secondaryUnit && (
                <InfoRow label="Secondary Unit" value={product.secondaryUnit} />
              )}
              {product.unitConvertion && (
                <InfoRow
                  label="Unit Conversion"
                  value={formatNumber(product.unitConvertion)}
                />
              )}
            </div>
          </div>

          <Separator />

          {/* Inventory */}
          <div>
            <h3 className="mb-3 text-lg font-semibold">Inventory</h3>
            <div className="space-y-2">
              <InfoRow
                label="Current Stock"
                value={formatNumber(product.currentStockLevel)}
              />
              {product.minStockLevel !== null &&
                product.minStockLevel !== undefined && (
                  <InfoRow
                    label="Min Stock Level"
                    value={formatNumber(product.minStockLevel)}
                  />
                )}
              {product.maxStockLevel !== null &&
                product.maxStockLevel !== undefined && (
                  <InfoRow
                    label="Max Stock Level"
                    value={formatNumber(product.maxStockLevel)}
                  />
                )}
              {product.reorderLevel !== null &&
                product.reorderLevel !== undefined && (
                  <InfoRow
                    label="Reorder Level"
                    value={formatNumber(product.reorderLevel)}
                  />
                )}
            </div>
          </div>

          <Separator />

          {/* Pricing */}
          <div>
            <h3 className="mb-3 text-lg font-semibold">Pricing</h3>
            <div className="space-y-2">
              <InfoRow
                label="Cost Price"
                value={formatCurrency(product.costPrice)}
              />
              <InfoRow
                label="Selling Price"
                value={formatCurrency(product.sellingPrice)}
              />
              {product.mrp !== null && product.mrp !== undefined && (
                <InfoRow label="MRP" value={formatCurrency(product.mrp)} />
              )}
              <InfoRow
                label="Tax Rate"
                value={`${formatNumber(product.taxRate)}%`}
              />
              <InfoRow
                label="Discount Rate"
                value={`${formatNumber(product.discountRate)}%`}
              />
            </div>
          </div>

          {/* Attachments */}
          {product.attachments && product.attachments.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-3 text-lg font-semibold">Attachments</h3>
                <div className="space-y-2">
                  {product.attachments.map((attachment: any, index: number) => (
                    <a
                      key={index}
                      href={attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-blue-600 hover:underline"
                    >
                      Attachment {index + 1}
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Timestamps */}
          <Separator />
          <div>
            <h3 className="mb-3 text-lg font-semibold">Timestamps</h3>
            <div className="space-y-2">
              <InfoRow
                label="Created At"
                value={new Date(product.createdAt).toLocaleString()}
              />
              <InfoRow
                label="Updated At"
                value={new Date(product.updatedAt).toLocaleString()}
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
