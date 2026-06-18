/* Skeleton helpers — używać w widgetach na czas ładowania SWR */

export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div className="skel-row" key={i}>
          <span className="skeleton skel-text lg" style={{ width: 110 }} />
          <span
            className="skeleton skel-text"
            style={{ flex: 1, maxWidth: 220 }}
          />
          <span className="skeleton skel-text" style={{ width: 80 }} />
          <span className="skeleton skel-text" style={{ width: 60 }} />
        </div>
      ))}
    </>
  );
}

export function SkeletonAvatars({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div className="skel-row" key={i}>
          <span
            className="skeleton skel-circle"
            style={{ width: 36, height: 36 }}
          />
          <div style={{ flex: 1 }}>
            <span
              className="skeleton skel-text"
              style={{ width: "40%", display: "block", marginBottom: 6 }}
            />
            <span
              className="skeleton skel-text sm"
              style={{ width: "70%", display: "block" }}
            />
          </div>
        </div>
      ))}
    </>
  );
}
