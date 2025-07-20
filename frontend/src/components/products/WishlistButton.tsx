import React, { useState } from 'react';
import { Heart, Loader, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';

interface WishlistButtonProps {
  productId: string;
  isInWishlist?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  labelText?: {
    add?: string;
    remove?: string;
  };
  onAuthRequired?: () => void;
  onToggleWishlist?: (productId: string) => void;
  className?: string;
  isAuthenticated?: boolean;
}

interface WishlistMutationContext {
  previousWishlist?: string[];
}

// Mock API functions - replace with actual API calls
const addToWishlistAPI = async (_productId: string): Promise<void> => {
  // Simulate API call
  await new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      // Simulate random failure for testing
      if (Math.random() > 0.9) {
        reject(new Error('Failed to add to wishlist'));
      } else {
        resolve();
      }
    }, 500);
  });
};

const removeFromWishlistAPI = async (_productId: string): Promise<void> => {
  // Simulate API call
  await new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      // Simulate random failure for testing
      if (Math.random() > 0.9) {
        reject(new Error('Failed to remove from wishlist'));
      } else {
        resolve();
      }
    }, 500);
  });
};

export const WishlistButton: React.FC<WishlistButtonProps> = ({
  productId,
  isInWishlist = false,
  size = 'md',
  showLabel = false,
  labelText = {
    add: 'Add to Wishlist',
    remove: 'Remove from Wishlist'
  },
  onAuthRequired,
  onToggleWishlist,
  className,
  isAuthenticated = true
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showError, setShowError] = useState(false);
  const queryClient = useQueryClient();

  // Optimistically update the local state
  const [optimisticState, setOptimisticState] = useState(isInWishlist);

  // Size configurations
  const sizeConfig = {
    sm: {
      button: 'p-1.5',
      icon: 'w-4 h-4',
      text: 'text-sm'
    },
    md: {
      button: 'p-2',
      icon: 'w-5 h-5',
      text: 'text-base'
    },
    lg: {
      button: 'p-3',
      icon: 'w-6 h-6',
      text: 'text-lg'
    }
  };

  const config = sizeConfig[size];

  // Add to wishlist mutation
  const addMutation = useMutation<void, Error, string, WishlistMutationContext>({
    mutationFn: addToWishlistAPI,
    onMutate: async (productId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['wishlist'] });

      // Snapshot the previous value
      const previousWishlist = queryClient.getQueryData<string[]>(['wishlist']);

      // Optimistically update
      setOptimisticState(true);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);

      // Update cache optimistically
      queryClient.setQueryData<string[]>(['wishlist'], (old = []) => [...old, productId]);

      return { previousWishlist };
    },
    onSuccess: () => {
      // Call the parent callback on success
      onToggleWishlist?.(productId);
    },
    onError: (_err, _productId, context) => {
      // Rollback on error
      setOptimisticState(false);
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);

      if (context?.previousWishlist) {
        queryClient.setQueryData(['wishlist'], context.previousWishlist);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    }
  });

  // Remove from wishlist mutation
  const removeMutation = useMutation<void, Error, string, WishlistMutationContext>({
    mutationFn: removeFromWishlistAPI,
    onMutate: async (productId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['wishlist'] });

      // Snapshot the previous value
      const previousWishlist = queryClient.getQueryData<string[]>(['wishlist']);

      // Optimistically update
      setOptimisticState(false);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);

      // Update cache optimistically
      queryClient.setQueryData<string[]>(['wishlist'], (old = []) => 
        old.filter(id => id !== productId)
      );

      return { previousWishlist };
    },
    onSuccess: () => {
      // Call the parent callback on success
      onToggleWishlist?.(productId);
    },
    onError: (_err, _productId, context) => {
      // Rollback on error
      setOptimisticState(true);
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);

      if (context?.previousWishlist) {
        queryClient.setQueryData(['wishlist'], context.previousWishlist);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    }
  });

  const isLoading = addMutation.isPending || removeMutation.isPending;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check authentication
    if (!isAuthenticated) {
      onAuthRequired?.();
      return;
    }

    // Toggle wishlist state
    if (optimisticState) {
      removeMutation.mutate(productId);
    } else {
      addMutation.mutate(productId);
    }
  };

  const buttonClasses = clsx(
    'relative group transition-all duration-200 rounded-full',
    'hover:bg-gray-100 dark:hover:bg-gray-800',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    config.button,
    showLabel && 'flex items-center gap-2 px-4 rounded-lg',
    className
  );

  const heartClasses = clsx(
    config.icon,
    'transition-all duration-300',
    isAnimating && 'scale-125',
    optimisticState 
      ? 'fill-red-500 text-red-500' 
      : 'text-gray-600 dark:text-gray-400 group-hover:text-red-500'
  );

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={buttonClasses}
        aria-label={optimisticState ? labelText.remove : labelText.add}
        title={optimisticState ? labelText.remove : labelText.add}
      >
        {isLoading ? (
          <Loader className={clsx(config.icon, 'animate-spin')} />
        ) : (
          <>
            <Heart className={heartClasses} />
            {showLabel && (
              <span className={clsx(config.text, 'font-medium')}>
                {optimisticState ? labelText.remove : labelText.add}
              </span>
            )}
          </>
        )}
      </button>

      {/* Error Notification */}
      {showError && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-slide-up">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to update wishlist. Please try again.</span>
        </div>
      )}
    </>
  );
};

// Guest User Modal Component
export const GuestWishlistModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
}> = ({ isOpen, onClose, onSignIn, onSignUp }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Sign in to save favorites
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Create an account or sign in to save items to your wishlist and access them anytime.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onSignIn}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={onSignUp}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Sign Up
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full mt-3 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          Continue browsing
        </button>
      </div>
    </div>
  );
};

export default WishlistButton;