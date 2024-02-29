import { getBox } from "css-box-model";
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAppContext } from "../../context";
import { ViewportControls } from "../../../ViewportControls";
import styles from "../../styles.module.css";
import { getClassNameFactory } from "../../../../lib";
import { Preview } from "../Preview";
import { getZoomConfig } from "../../../../lib/get-zoom-config";

const getClassName = getClassNameFactory("Puck", styles);

const ZOOM_ON_CHANGE = true;

export const Canvas = () => {
  const { dispatch, state, overrides, setUi } = useAppContext();
  const { ui } = state;
  const frameRef = useRef<HTMLDivElement>(null);

  const [rootHeight, setRootHeight] = useState(0);
  const [autoZoom, setAutoZoom] = useState(0);
  const [showTransition, setShowTransition] = useState(false);

  const defaultRender = useMemo<
    React.FunctionComponent<{ children?: ReactNode }>
  >(() => {
    const PuckDefault = ({ children }: { children?: ReactNode }) => (
      <>{children}</>
    );

    return PuckDefault;
  }, []);

  const CustomPreview = useMemo(
    () => overrides.preview || defaultRender,
    [overrides]
  );

  const getFrameDimensions = useCallback(() => {
    if (frameRef.current) {
      const frame = frameRef.current;

      const box = getBox(frame);

      return { width: box.contentBox.width, height: box.contentBox.height };
    }

    return { width: 0, height: 0 };
  }, [frameRef]);

  const resetAutoZoom = useCallback(() => {
    if (frameRef.current) {
      dispatch({
        type: "setUi",
        ui: (ui) => {
          const zoomConfig = getZoomConfig(
            ui.viewports.current,
            frameRef.current!
          );

          setRootHeight(zoomConfig.rootHeight);
          setAutoZoom(zoomConfig.autoZoom);

          return {
            ...ui,
            viewports: {
              ...ui.viewports,
              current: {
                ...ui.viewports.current,
                zoom: zoomConfig.zoom,
              },
            },
          };
        },
      });
    }
  }, [frameRef, autoZoom]);

  // Auto zoom
  useEffect(() => {
    setShowTransition(false);
    resetAutoZoom();
  }, [frameRef, ui.leftSideBarVisible, ui.rightSideBarVisible]);

  // Constrain height
  useEffect(() => {
    const { height: frameHeight } = getFrameDimensions();

    if (ui.viewports.current.height === "auto") {
      setRootHeight(frameHeight / ui.viewports.current.zoom);
    }
  }, [ui.viewports.current.zoom]);

  // Resize based on window size
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      setShowTransition(false);
      resetAutoZoom();
    });

    if (document.body) {
      observer.observe(document.body);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      className={getClassName("canvas")}
      onClick={() =>
        dispatch({
          type: "setUi",
          ui: { itemSelector: null },
          recordHistory: true,
        })
      }
    >
      {ui.viewports.controlsVisible && (
        <div className={getClassName("canvasControls")}>
          <ViewportControls
            autoZoom={autoZoom}
            onViewportChange={(viewport) => {
              setShowTransition(true);

              const uiViewport = {
                ...viewport,
                height: viewport.height || "auto",
                zoom: ui.viewports.current.zoom,
              };

              setUi({ viewports: { ...ui.viewports, current: uiViewport } });

              if (ZOOM_ON_CHANGE) {
                resetAutoZoom();
              }
            }}
            onZoom={(zoom) => {
              setShowTransition(true);

              setUi({
                viewports: {
                  ...ui.viewports,
                  current: {
                    ...ui.viewports.current,
                    zoom,
                  },
                },
              });
            }}
          />
        </div>
      )}
      <div className={getClassName("frame")} ref={frameRef}>
        <div
          className={getClassName("root")}
          style={{
            width: ui.viewports.current.width,
            height: rootHeight,
            transform: `scale(${ui.viewports.current.zoom})`,
            transition: showTransition
              ? "width 150ms ease-out, height 150ms ease-out, transform 150ms ease-out"
              : "",
          }}
        >
          <CustomPreview>
            <Preview />
          </CustomPreview>
        </div>
      </div>
    </div>
  );
};
