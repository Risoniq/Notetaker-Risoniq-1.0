import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useApprovalCheck = () => {
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkApproval = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsApproved(false);
          setLoading(false);
          return;
        }

        // Check if user is approved using the database function
        const { data, error } = await supabase.rpc('is_approved', {
          _user_id: user.id,
        });

        if (error) {
          console.error('Error checking approval status:', error);
          setIsApproved(false);
        } else {
          setIsApproved(data === true);
        }
      } catch (error) {
        console.error('Error in approval check:', error);
        setIsApproved(false);
      } finally {
        setLoading(false);
      }
    };

    checkApproval();

    // Re-check when auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkApproval();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isApproved, loading };
};
