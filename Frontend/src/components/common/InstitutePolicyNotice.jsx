const DEFAULT_POLICY_TEXT =
  'The institute reserves the right to cancel admission or access at any time for policy violations, non-payment, misuse of facilities, or safety and disciplinary reasons.';

const variantClasses = {
  soft: 'border-amber-200 bg-amber-50 text-amber-900',
  dark: 'border-white/10 bg-white/5 text-gray-300',
};

export default function InstitutePolicyNotice({
  className = '',
  compact = false,
  variant = 'soft',
}) {
  return (
    <div
      className={`rounded-lg border px-4 ${
        compact ? 'py-2 text-xs' : 'py-3 text-sm'
      } ${variantClasses[variant] || variantClasses.soft} ${className}`}
    >
      <span className='font-semibold'>Important notice: </span>
      {DEFAULT_POLICY_TEXT}
    </div>
  );
}
