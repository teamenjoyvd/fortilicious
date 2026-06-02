'use server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/proxy';
import { revalidatePath } from 'next/cache';

/**
 * Server Action to create a new manual Vera product/service/event.
 */
export async function createManualProduct(
  name: string,
  price: number,
  category: string,
  description: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const userId = await requireAuth();

    if (!name.trim()) {
      return { success: false, error: 'Product name is required' };
    }

    const supabase = await createClerkSupabaseClient();
    const { data, error } = await supabase
      .from('products')
      .insert({
        user_id: userId,
        name: name.trim(),
        brand: 'vera', // manually entered products belong to Vera brand
        category: category.trim() || 'Services',
        price: price || 0,
        wholesale_price: null,
        currency: 'EUR', // default custom currency
        description: description.trim() || null,
        source: 'manual',
        active: true,
        sync_locked: false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('createManualProduct Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/products');
    revalidatePath('/');
    return { success: true, id: data.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to toggle the sync_locked status of an Amway product.
 * Locks manual overrides or unlocks to resume scraper sync.
 */
export async function toggleProductSyncLock(
  id: string,
  syncLocked: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const supabase = await createClerkSupabaseClient();
    const { error } = await supabase
      .from('products')
      .update({ sync_locked: syncLocked })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('toggleProductSyncLock Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/products');
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to update manual pricing / description of a product.
 * Also automatically locks the product if it's an Amway product to prevent sync overwrites.
 */
export async function updateProductDetails(
  id: string,
  updates: { name?: string; price?: number; category?: string; description?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const supabase = await createClerkSupabaseClient();
    
    // Fetch product to see if it's Amway
    const { data: prod } = await supabase
      .from('products')
      .select('source')
      .eq('id', id)
      .single();

    const isAmway = prod?.source === 'amway-price-checker';
    
    const { error } = await supabase
      .from('products')
      .update({
        ...updates,
        // Automatically lock sync updates if Vera manually overrides Amway details
        ...(isAmway ? { sync_locked: true } : {}),
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('updateProductDetails Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/products');
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to delete a manually created product.
 * Synced products are tombstoned by the sync loader, not manually deleted.
 */
export async function deleteManualProduct(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const supabase = await createClerkSupabaseClient();
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('source', 'manual') // safe gate
      .eq('user_id', userId);

    if (error) {
      console.error('deleteManualProduct Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/products');
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to associate a product to a Content Pillar.
 */
export async function connectProductToPillar(
  pillarId: string,
  productId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const supabase = await createClerkSupabaseClient();
    const { error } = await supabase
      .from('pillar_products')
      .insert({
        pillar_id: pillarId,
        product_id: productId,
        user_id: userId,
        notes: notes?.trim() || null,
      });

    if (error) {
      console.error('connectProductToPillar Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/pillars/${pillarId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to disconnect a product from a Content Pillar.
 */
export async function disconnectProductFromPillar(
  pillarId: string,
  productId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const supabase = await createClerkSupabaseClient();
    const { error } = await supabase
      .from('pillar_products')
      .delete()
      .eq('pillar_id', pillarId)
      .eq('product_id', productId)
      .eq('user_id', userId);

    if (error) {
      console.error('disconnectProductFromPillar Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/pillars/${pillarId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}
