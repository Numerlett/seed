'use client';

import { useState } from 'react';
import { clientTrpc } from '@seed/api/client';
import { useBusiness } from '@/providers/BusinessProvider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
} from 'lucide-react';
import ProductDetailSheet from './ProductDetailSheet';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import type { ProductWithCategory } from '@/types/inventory';

type SortOrder = 'asc' | 'desc';
type OrderBy = 'createdAt' | 'name' | 'currentStockLevel' | 'sellingPrice';
type StockStatus = 'all' | 'inStock' | 'lowStock' | 'outOfStock';

export default function ProductsTable() {
  const { currentBusinessMembership } = useBusiness();
  const activeBusiness = currentBusinessMembership?.business;
  const utils = clientTrpc.useUtils();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Table state
  // Sync state with search params
  const getParam = (key: string, fallback: string) =>
    searchParams.get(key) || fallback;
  const pageNumber = Number(getParam('page', '1'));
  const pageSize = Number(getParam('pageSize', '10'));
  const search = getParam('search', '');
  const orderBy = getParam('orderBy', 'createdAt') as OrderBy;
  const order = getParam('order', 'desc') as SortOrder;
  const categoryFilter = getParam('categoryId', 'all');
  const activeFilter = getParam('active', 'all');
  const stockStatusFilter = getParam('stockStatus', 'all') as StockStatus;

  // Sheet state
  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithCategory | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Delete dialog state
  const [productToDelete, setProductToDelete] =
    useState<ProductWithCategory | null>(null);

  // Fetch products
  const { data, isLoading, isError } =
    clientTrpc.inventory.getProducts.useQuery(
      {
        businessId: activeBusiness?.id || '',
        pageSize,
        pageNumber,
        order,
        orderBy,
        search: search || undefined,
        categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
        isActive:
          activeFilter === 'all'
            ? undefined
            : activeFilter === 'active'
              ? true
              : false,
        stockStatus: stockStatusFilter,
      },
      {
        enabled: !!activeBusiness?.id,
      },
    );

  // Fetch categories for filter
  const { data: categories } =
    clientTrpc.category.getCategoriesByBusinessId.useQuery(
      { businessId: activeBusiness?.id || '' },
      { enabled: !!activeBusiness?.id },
    );

  // Delete mutation
  const deleteMutation = clientTrpc.inventory.deleteProduct.useMutation({
    onSuccess: () => {
      toast.success('Product deleted successfully!');
      utils.inventory.getProducts.invalidate();
      setProductToDelete(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete product');
    },
  });

  const products = data?.products || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Update search params utility
  const updateParams = (
    params: Record<string, string | number | undefined>,
  ) => {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === 'all') {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    });
    router.replace(`?${newParams.toString()}`);
  };

  const handleSort = (column: OrderBy) => {
    if (orderBy === column) {
      updateParams({
        order: order === 'asc' ? 'desc' : 'asc',
        orderBy: column,
      });
    } else {
      updateParams({ orderBy: column, order: 'asc' });
    }
    updateParams({ page: 1 });
  };

  const getSortIcon = (column: OrderBy) => {
    if (orderBy !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return order === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const getStockBadge = (stock: any) => {
    const stockNum =
      typeof stock === 'string'
        ? parseFloat(stock)
        : typeof stock === 'number'
          ? stock
          : Number(stock);
    if (stockNum <= 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (stockNum < 10) {
      return <Badge variant="secondary">Low Stock</Badge>;
    }
    return <Badge>In Stock</Badge>;
  };

  const formatCurrency = (value: any) => {
    const numValue =
      typeof value === 'string'
        ? parseFloat(value)
        : typeof value === 'number'
          ? value
          : Number(value);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(numValue);
  };

  const handleRowClick = (product: ProductWithCategory) => {
    setSelectedProduct(product);
    setIsSheetOpen(true);
  };

  const handleDeleteClick = (
    product: ProductWithCategory,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setProductToDelete(product);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteMutation.mutate({ id: productToDelete.id });
    }
  };

  if (!activeBusiness) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">No active business selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name, SKU, or barcode..."
            value={search}
            onChange={(e) => {
              updateParams({ search: e.target.value, page: 1 });
            }}
            className="pl-9"
          />
        </div>

        {/* Category Filter */}
        <Select
          value={categoryFilter}
          onValueChange={(value) => {
            updateParams({ categoryId: value, page: 1 });
          }}
        >
          <SelectTrigger className="w-45">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Active Status Filter */}
        <Select
          value={activeFilter}
          onValueChange={(value) => {
            updateParams({ active: value, page: 1 });
          }}
        >
          <SelectTrigger className="w-37.5">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {/* Stock Status Filter */}
        <Select
          value={stockStatusFilter}
          onValueChange={(value: StockStatus) => {
            updateParams({ stockStatus: value, page: 1 });
          }}
        >
          {/* Reset Filters Button */}
          <Button
            variant="outline"
            className="ml-2"
            onClick={() => {
              router.replace('?');
            }}
          >
            Reset Filters
          </Button>
          <SelectTrigger className="w-37.5">
            <SelectValue placeholder="Stock Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="inStock">In Stock</SelectItem>
            <SelectItem value="lowStock">Low Stock</SelectItem>
            <SelectItem value="outOfStock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('name')}
                  className="flex items-center"
                >
                  Name
                  {getSortIcon('name')}
                </Button>
              </TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('currentStockLevel')}
                  className="flex items-center"
                >
                  Stock
                  {getSortIcon('currentStockLevel')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('sellingPrice')}
                  className="flex items-center"
                >
                  Price
                  {getSortIcon('sellingPrice')}
                </Button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-50" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-25" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-30" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-red-500">
                  Error loading products
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground text-center"
                >
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow
                  key={product.id}
                  className="cursor-pointer"
                  onClick={() => handleRowClick(product)}
                >
                  <TableCell>
                    {product.image && (
                      <Image
                        src={product.image}
                        alt={product.name}
                        width={50}
                        height={50}
                        className="rounded"
                      />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.sku}</TableCell>
                  <TableCell>
                    {product.category?.name || (
                      <span className="text-muted-foreground">
                        Uncategorized
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{String(product.currentStockLevel)}</span>
                      {getStockBadge(product.currentStockLevel)}
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(product.sellingPrice)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleDeleteClick(product, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          Showing {products.length === 0 ? 0 : (pageNumber - 1) * pageSize + 1}{' '}
          to {Math.min(pageNumber * pageSize, totalCount)} of {totalCount}{' '}
          products
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">Rows per page:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                updateParams({ pageSize: value, page: 1 });
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => updateParams({ page: 1 })}
              disabled={pageNumber === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                updateParams({ page: Math.max(1, pageNumber - 1) })
              }
              disabled={pageNumber === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 px-2">
              <span className="text-sm">
                Page {pageNumber} of {totalPages || 1}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                updateParams({ page: Math.min(totalPages, pageNumber + 1) })
              }
              disabled={pageNumber >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => updateParams({ page: totalPages })}
              disabled={pageNumber >= totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Product Detail Sheet */}
      <ProductDetailSheet
        product={selectedProduct}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!productToDelete}
        onOpenChange={(open) => !open && setProductToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the product &quot;
              {productToDelete?.name}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
