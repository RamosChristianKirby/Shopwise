// Option pickers (Color, Size…) for products with variants, with live availability per value.

export const optionNames = (product) => {
  if (product?.optionNames?.length) return product.optionNames;
  const names = new Set();
  (product?.variants || []).forEach((v) => Object.keys(v.options || {}).forEach((k) => names.add(k)));
  return [...names];
};

export const optionValues = (product, name) => [...new Set((product?.variants || []).map((v) => v.options?.[name]).filter(Boolean))];

/** The variant matching every selected option, or null. */
export function findVariant(product, selected) {
  const names = optionNames(product);
  if (!names.length || names.some((n) => !selected?.[n])) return null;
  return (product.variants || []).find((v) => names.every((n) => v.options?.[n] === selected[n])) || null;
}

/** What the cart and price display need for one variant. */
export function variantView(product, variant) {
  if (!variant) return null;
  const names = optionNames(product);
  return {
    _id: variant._id,
    label: names.map((n) => variant.options?.[n]).filter(Boolean).join(' / '),
    price: variant.price ?? product.price,
    compareAtPrice: variant.compareAtPrice ?? product.compareAtPrice,
    stock: variant.stock,
    image: variant.image || product.images?.[0],
    sku: variant.sku,
  };
}

/** Pre-selects the first in-stock variant so the page shows a buyable price straight away. */
export function defaultSelection(product) {
  const names = optionNames(product);
  const v = (product?.variants || []).find((x) => x.stock > 0) || product?.variants?.[0];
  return v ? Object.fromEntries(names.map((n) => [n, v.options?.[n]])) : {};
}

export default function VariantPicker({ product, selected, onChange }) {
  const names = optionNames(product);
  if (!names.length) return null;

  // A value is available if some in-stock variant has it together with the other current selections.
  const available = (name, value) =>
    (product.variants || []).some((v) => v.stock > 0 && v.options?.[name] === value && names.every((n) => n === name || !selected[n] || v.options?.[n] === selected[n]));

  return (
    <div className="stack" style={{ gap: 14 }}>
      {names.map((name) => (
        <div className="vgroup" key={name} role="radiogroup" aria-label={name}>
          <div className="vgroup-label">{name}<span>{selected[name] || 'Choose'}</span></div>
          <div className="vbtns">
            {optionValues(product, name).map((value) => {
              const ok = available(name, value);
              const active = selected[name] === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`vbtn ${active ? 'active' : ''} ${ok ? '' : 'na'}`}
                  onClick={() => onChange({ ...selected, [name]: value })}
                  title={ok ? value : `${value} — sold out with this combination`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
