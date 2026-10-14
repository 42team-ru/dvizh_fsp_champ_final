import { useMemo } from "react";
import type { Variants } from "motion/react";

export interface RegisterFormMotionVariants {
  formShell: Variants;
  stepRoot: Variants;
  stepBlock: Variants;
  links: Variants;
}

export function useRegisterFormMotionVariants(
  reduceMotion: boolean | null,
): RegisterFormMotionVariants {
  return useMemo(() => {
    if (reduceMotion) {
      const instant: Variants = {
        hidden: { opacity: 1 },
        visible: { opacity: 1 },
      };

      return {
        formShell: instant,
        stepRoot: instant,
        stepBlock: instant,
        links: instant,
      };
    }

    const formShellVariants: Variants = {
      hidden: { opacity: 0, y: 18 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.45,
          ease: [0.22, 1, 0.36, 1],
        },
      },
    };

    const stepRootVariants: Variants = {
      hidden: {},
      visible: {
        transition: {
          staggerChildren: 0.055,
          delayChildren: 0.06,
        },
      },
    };

    const stepBlockVariants: Variants = {
      hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
      visible: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 30,
          mass: 0.82,
        },
      },
    };

    const linksVariants: Variants = {
      hidden: { opacity: 0, y: 8 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          delay: 0.2,
          duration: 0.4,
          ease: [0.22, 1, 0.36, 1],
        },
      },
    };

    return {
      formShell: formShellVariants,
      stepRoot: stepRootVariants,
      stepBlock: stepBlockVariants,
      links: linksVariants,
    };
  }, [reduceMotion]);
}
