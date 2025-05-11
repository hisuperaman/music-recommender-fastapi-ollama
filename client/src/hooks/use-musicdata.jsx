import { useCallback, useEffect, useState } from "react";

export function useMusicData(endpoint) {
  const [data, setData] = useState();

  const fetchData = useCallback(() => {
    fetch(endpoint, { credentials: "include" })
      .then(res => res.json())
      .then(data => setData(data))
      .catch(() => setData([]));
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, refetch: fetchData };
}