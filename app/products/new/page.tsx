import { createManualProduct } from '@/lib/actions/products';
import Link from 'next/link';
import { ChevronLeft, PackagePlus, Check, X } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function NewProductPage() {
  
  // Submit handler mapping form fields to createManualProduct action
  async function handleSubmit(formData: FormData) {
    'use server';
    const name = formData.get('name') as string;
    const priceRaw = formData.get('price') as string;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;

    const price = parseFloat(priceRaw) || 0;

    if (!name || !name.trim()) return;

    await createManualProduct(name, price, category, description);
    redirect('/products');
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto animate-in fade-in duration-300">
      
      {/* Navigation Breadcrumbs */}
      <nav className="flex items-center gap-2">
        <Link
          href="/products"
          className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Catalog
        </Link>
      </nav>

      {/* Main Glassmorphic Form Card */}
      <section className="glass-panel border border-slate-900 rounded-3xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-900/60">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
            <PackagePlus className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-white">Create Custom Product</h1>
            <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
              Manually log services, coaching consults, events, or local branding items.
            </p>
          </div>
        </div>

        <form action={handleSubmit} className="flex flex-col gap-5">
          
          {/* Name Field */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-xs font-semibold text-slate-400">
              Product/Service Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="e.g. 1-on-1 Metabolism Audit Consult"
              required
              className="h-10 px-3.5 text-sm bg-slate-950 border border-slate-900 text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 placeholder:text-slate-600 transition-all"
            />
          </div>

          {/* Pricing & Category Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Price Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="price" className="text-xs font-semibold text-slate-400">
                Retail Price (EUR)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                id="price"
                name="price"
                placeholder="e.g. 49.00"
                required
                className="h-10 px-3.5 text-sm bg-slate-950 border border-slate-900 text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 placeholder:text-slate-600 transition-all"
              />
            </div>

            {/* Category Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="category" className="text-xs font-semibold text-slate-400">
                Category Group
              </label>
              <select
                id="category"
                name="category"
                className="h-10 px-3.5 text-sm bg-slate-950 border border-slate-900 text-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all cursor-pointer"
              >
                <option value="Services">Personal Coaching / Services</option>
                <option value="Events">Live Seminars / Events</option>
                <option value="Branding">Fortilicious Custom Branded Products</option>
                <option value="Supplements">Manual Diet Supplements</option>
              </select>
            </div>

          </div>

          {/* Description Field */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-xs font-semibold text-slate-400">
              Product Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Detail the scope of the coaching package, seminar outline, or manual product details."
              className="p-3.5 text-sm bg-slate-950 border border-slate-900 text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 placeholder:text-slate-600 transition-all resize-none"
            />
          </div>

          {/* Form Actions footer */}
          <div className="flex gap-2 justify-end border-t border-slate-900/60 pt-6 mt-2">
            <Link
              href="/products"
              className="h-10 px-4 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </Link>
            <button
              type="submit"
              className="h-10 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-rose-500/10 transition-colors"
            >
              <Check className="w-4 h-4" />
              Add Product
            </button>
          </div>

        </form>
      </section>

    </div>
  );
}
