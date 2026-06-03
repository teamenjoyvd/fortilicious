'use client';

import { useTransition } from 'react';
import { deleteManualProduct } from '@/lib/actions/products';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';

interface DeleteManualProductButtonProps {
  productId: string;
  productName: string;
}

export default function DeleteManualProductButton({ productId, productName }: DeleteManualProductButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete "${productName}"?`)) {
      return;
    }
    startTransition(async () => {
      const res = await deleteManualProduct(productId);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Failed to delete product');
      }
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-burgundy rounded-lg transition-all duration-200 active:scale-90 disabled:opacity-50 flex items-center justify-center"
      title="Delete manual product"
    >
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-burgundy" />
      ) : (
        <Trash2 className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
