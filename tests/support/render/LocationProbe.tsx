import { useLocation } from "react-router-dom";

/** Renders the current URL so tests can assert on router state. */
export function LocationProbe() {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{pathname + search}</output>;
}
