import { forwardRef, InputHTMLAttributes } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`
          w-full
          bg-slate-900
          border border-slate-800
          rounded-xl
          px-4
          py-3
          text-slate-100
          placeholder:text-slate-500
          
          outline-none
          transition-all
          duration-200
          
          focus:border-blue-500
          focus:ring-2
          focus:ring-blue-500/20
          
          hover:border-slate-700
          
          ${className}
        `}
        {...props}
      />
    )
  }
)

Input.displayName = "Input"

export default Input