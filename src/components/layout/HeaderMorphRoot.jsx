import { useEffect } from 'react';
import { useGlobalHeaderMorph } from '@/hooks/useGlobalHeaderMorph';
import { injectWizardChromeMorphStyles } from '@/components/layout/wizardChromeMorphStyles';

/** Mount once under App — drives `--header-morph` on `:root` for all pages. */
const HeaderMorphRoot = () => {
  useEffect(() => {
    injectWizardChromeMorphStyles();
  }, []);
  useGlobalHeaderMorph();
  return null;
};

export default HeaderMorphRoot;
