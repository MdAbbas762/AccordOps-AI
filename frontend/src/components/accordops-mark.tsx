type AccordOpsMarkProps = {
  className?: string;
};

export default function AccordOpsMark({
  className = "h-5 w-5",
}: AccordOpsMarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M20 3.8 33 11.3v15L20 33.8 7 26.3v-15L20 3.8Z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M12.8 15.2h10.4M12.8 20h7.6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="m20.9 25.1 3 3 5.4-6.2"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="29.4" cy="13.4" r="2.3" fill="currentColor" />
    </svg>
  );
}
