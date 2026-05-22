import InputFieldSlash from '@/components/forms/InputFieldSlash';
import React from 'react';

/* MIH InputFieldRange — Figma "Input Field Range" (node 2496:5498). Two
   inputs separated by a literal "-". Identical layout + token contract to
   InputFieldSlash; only the separator differs. Implemented as a thin
   alias so the variant axis (slash vs dash) stays one line of code.

   Used for ranges such as "from – to" (date or numeric).               */

const InputFieldRange = React.forwardRef(function InputFieldRange(props, ref) {
  return <InputFieldSlash ref={ref} separator='-' {...props} />;
});

export default InputFieldRange;
