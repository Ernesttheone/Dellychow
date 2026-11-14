import React from 'react';
import { UtensilsCrossed, Heart, Globe, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string, params?: any) => void;
  onOpenSupportModal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenSupportModal }) => {
  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <span className="font-serif-display text-xl font-bold text-white tracking-tight">
                DellyChow
              </span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              An international culinary community uniting passionate chefs and food lovers. Discover step-by-step master recipes, video tutorials, and private chef circles.
            </p>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <Globe className="w-4 h-4 text-amber-500" />
              <span>Worldwide culinary exchange</span>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-3">
              Explore Recipes
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate('explore', { category: 'breakfast' })} className="hover:text-amber-400 transition-colors">
                  Artisanal Breakfasts
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('explore', { category: 'lunch' })} className="hover:text-amber-400 transition-colors">
                  Wholesome Lunches
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('explore', { category: 'dinner' })} className="hover:text-amber-400 transition-colors">
                  Gourmet Dinners
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('explore', { category: 'desserts' })} className="hover:text-amber-400 transition-colors">
                  French & Global Desserts
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('explore', { category: 'snacks' })} className="hover:text-amber-400 transition-colors">
                  Savory Snacks & Small Plates
                </button>
              </li>
            </ul>
          </div>

          {/* Chefs & VIP */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-3">
              Chefs & Communities
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate('premium')} className="hover:text-amber-400 transition-colors">
                  VIP Masterclasses & Kitchens
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('videos')} className="hover:text-amber-400 transition-colors">
                  Masterclass Cooking Videos
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('account')} className="hover:text-amber-400 transition-colors">
                  Join as a Creator Chef
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('favourites')} className="hover:text-amber-400 transition-colors">
                  Saved Recipe Bookmarks
                </button>
              </li>
            </ul>
          </div>

          {/* Support & Standards */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-3">
              Legal Centre &amp; Help
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('legal')}
                  className="hover:text-amber-400 transition-colors cursor-pointer font-semibold text-amber-400"
                >
                  DellyChow Legal Centre
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('terms')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  Terms and Conditions
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('privacy')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('guidelines')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  Community Guidelines
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('copyright')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  Copyright &amp; IP Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('food-safety')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  Food Safety &amp; Recipe Disclaimer
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('cookies')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  Cookie Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('reporting')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  Content Reporting &amp; Appeals
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  className="hover:text-amber-400 transition-colors cursor-pointer"
                >
                  Contact &amp; Legal Support
                </button>
              </li>
            </ul>
            {onOpenSupportModal && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onOpenSupportModal}
                  className="px-3.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Contact Support &amp; Read FAQ
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 pt-1 text-xs text-stone-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Verified Chef Profiles &amp; Safe Memberships</span>
            </div>
          </div>
        </div>


        <div className="mt-12 pt-6 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>© {new Date().getFullYear()} DellyChow. Connecting chefs and food lovers worldwide.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('legal')}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Legal Centre
            </button>
            <button
              type="button"
              onClick={() => onNavigate('terms')}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => onNavigate('privacy')}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => onNavigate('guidelines')}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Guidelines
            </button>
            <button
              type="button"
              onClick={() => onNavigate('cookies')}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Cookies
            </button>
            <div className="flex items-center gap-1">
              <span>Crafted with</span>
              <Heart className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>for culinary lovers everywhere</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
