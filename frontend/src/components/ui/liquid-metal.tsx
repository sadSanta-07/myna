"use client";

import React, { forwardRef, memo } from "react";
import { LiquidMetal as LiquidMetalShader } from "@paper-design/shaders-react";
import { cn } from "@/lib/utils";

export interface LiquidMetalProps {
  colorBack?: string;
  colorTint?: string;
  speed?: number;
  repetition?: number;
  distortion?: number;
  scale?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const LiquidMetal = memo(function LiquidMetal({
  colorBack = "#aaaaac",
  colorTint = "#ffffff",
  speed = 0.5,
  repetition = 4,
  distortion = 0.1,
  scale = 1,
  className,
  style,
}: LiquidMetalProps) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 z-0 overflow-hidden", className)} style={style} aria-hidden="true">
      <LiquidMetalShader
        colorBack={colorBack}
        colorTint={colorTint}
        speed={speed}
        repetition={repetition}
        distortion={distortion}
        softness={0}
        shiftRed={0.3}
        shiftBlue={-0.3}
        angle={45}
        shape="none"
        scale={scale}
        fit="cover"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
});

LiquidMetal.displayName = "LiquidMetal";

export interface LiquidMetalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
  borderWidth?: number;
  metalConfig?: Omit<LiquidMetalProps, "className" | "style">;
  size?: "sm" | "md" | "lg";
}

export const LiquidMetalButton = forwardRef<HTMLButtonElement, LiquidMetalButtonProps>(
  (
    {
      children,
      icon,
      borderWidth = 3,
      metalConfig,
      size = "md",
      className,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const sizeStyles = {
      sm: "py-2 pl-2 pr-5 gap-2.5 text-sm",
      md: "py-2 pl-2 pr-5 gap-3 text-sm sm:py-2.5 sm:pl-2.5 sm:pr-6 sm:text-base",
      lg: "py-3 pl-3 pr-7 gap-3.5 text-base sm:py-3.5 sm:pl-3.5 sm:pr-8 sm:text-lg",
    };
    const iconSizes = {
      sm: "size-7",
      md: "size-8 sm:size-9",
      lg: "size-10 sm:size-11",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          "group relative inline-flex cursor-pointer border-0 bg-transparent p-0 outline-none transition-transform active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
        {...props}
      >
        <span className="relative isolate block overflow-hidden rounded-full shadow-[0_12px_32px_-12px_rgba(0,0,0,0.28)]" style={{ padding: borderWidth }}>
          <LiquidMetal
            colorBack={metalConfig?.colorBack ?? "#888888"}
            colorTint={metalConfig?.colorTint ?? "#ffffff"}
            speed={metalConfig?.speed ?? 0.4}
            repetition={metalConfig?.repetition ?? 4}
            distortion={metalConfig?.distortion ?? 0.15}
            scale={metalConfig?.scale ?? 1}
            className="rounded-full"
          />
          <span className={cn(
            "relative z-10 flex items-center rounded-full bg-white text-neutral-950 transition-colors duration-200 group-hover:bg-neutral-100",
            sizeStyles[size],
          )}>
            {icon && (
              <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-neutral-100 shadow-[inset_0_1px_3px_rgba(0,0,0,0.07)]", iconSizes[size])}>
                <span className="text-neutral-800">{icon}</span>
              </span>
            )}
            <span className="whitespace-nowrap font-semibold tracking-tight">{children}</span>
          </span>
        </span>
      </button>
    );
  },
);

LiquidMetalButton.displayName = "LiquidMetalButton";

export default LiquidMetalButton;
