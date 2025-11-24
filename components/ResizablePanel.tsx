"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ComponentProps, ReactNode, createContext, useContext, useRef, useEffect, useState } from "react";
import useMeasure from "react-use-measure";

let PanelContext = createContext({ value: "", direction: "forward" as "forward" | "backward" });

export function Root({
  children,
  value,
  ...rest
}: {
  children: ReactNode;
  value: string;
} & ComponentProps<"div">) {
  let [ref, bounds] = useMeasure();
  const [isInitialized, setIsInitialized] = useState(false);
  const previousValue = useRef(value);

  useEffect(() => {
    if (bounds.height > 0 && !isInitialized) {
      setIsInitialized(true);
    }
  }, [bounds.height, isInitialized]);

  const shouldAnimate = isInitialized && previousValue.current !== value;
  
  // Determine direction based on step numbers
  const direction = previousValue.current !== "" && previousValue.current !== value
    ? (parseInt(value) > parseInt(previousValue.current) ? "forward" : "backward")
    : "forward";
  
  useEffect(() => {
    if (shouldAnimate) {
      previousValue.current = value;
    }
  }, [value, shouldAnimate]);

  return (
    <div
      style={{ 
        position: "relative",
        height: "100%",
        width: "100%"
      }}
    >
      <div ref={ref} style={{ height: "100%", width: "100%" }}>
        <PanelContext.Provider value={{ value, direction }}>
          <div {...rest} style={{ height: "100%", width: "100%" }}>{children}</div>
        </PanelContext.Provider>
      </div>
    </div>
  );
}

export function Content({
  value,
  children,
  ...rest
}: {
  value: string;
  children: ReactNode;
} & ComponentProps<"div">) {
  let panelContext = useContext(PanelContext);
  let isActive = panelContext.value === value;
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isActive) {
      isFirstRender.current = false;
    }
  }, [isActive]);

  const getInitialX = () => {
    if (isFirstRender.current) return "0%"; // First render
    return panelContext.direction === "forward" ? "100%" : "-100%";
  };

  const getExitX = () => {
    return panelContext.direction === "forward" ? "-100%" : "100%";
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {isActive && (
        <motion.div
          key={value}
          initial={{ opacity: 0, x: getInitialX() }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: getExitX() }}
          transition={{
            ease: "easeInOut",
            duration: 0.4,
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            height: "100%",
            overflowY: "hidden",
            overflowX: "hidden"
          }}
        >
          <div {...rest}>{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

