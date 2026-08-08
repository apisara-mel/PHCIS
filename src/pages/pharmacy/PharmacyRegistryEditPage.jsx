import React from 'react';
import { useHistory, useParams } from 'react-router-dom';
import PharmacyRegistryEditor from '@/components/pharmacy/PharmacyRegistryEditor';

/* Full-page drug registry add/edit — `/pharmacy/registry/new` + deep-link
   `/pharmacy/registry/:id`. Form body lives in PharmacyRegistryEditor
   (shared with ExtraLarge edit popup on the list page). */

const PharmacyRegistryEditPage = () => {
  const { id } = useParams();
  const history = useHistory();
  const goList = () => history.push('/pharmacy/registry');

  return (
    <PharmacyRegistryEditor
      variant='page'
      drugId={id}
      onCancel={goList}
      onSaved={goList}
    />
  );
};

export default PharmacyRegistryEditPage;
