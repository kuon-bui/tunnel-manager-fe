"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createRouteKey,
  type EditableRoute,
} from "@/lib/domain-routes";

export function DomainRoutesEditor({
  routes,
  onChange,
  disabled = false,
}: {
  routes: EditableRoute[];
  onChange: (routes: EditableRoute[]) => void;
  disabled?: boolean;
}) {
  function updateRoute(key: string, patch: Partial<EditableRoute>) {
    onChange(routes.map((route) => {
      if (route.key !== key) return route;
      const next = { ...route, ...patch };
      if (next.path.trim() === "/") next.stripPrefix = false;
      return next;
    }));
  }

  function addRoute() {
    onChange([
      ...routes,
      { key: createRouteKey(), path: "/api", originUrl: "", stripPrefix: false },
    ]);
  }

  function removeRoute(key: string) {
    onChange(routes.filter((route) => route.key !== key));
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label>Routes</Label>
          <p className="text-xs text-muted-foreground">
            Exactly one `/` route is required. Optional paths are literal prefixes like `/api`.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRoute} disabled={disabled || routes.length >= 50}>
          <Plus />
          Add route
        </Button>
      </div>

      <div className="grid gap-3">
        {routes.map((route, index) => {
          const isRoot = route.path.trim() === "/";
          return (
            <div key={route.key} className="grid gap-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Route {index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeRoute(route.key)}
                  disabled={disabled || routes.length <= 1}
                  aria-label={`Remove route ${index + 1}`}
                >
                  <Trash2 />
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor={`route-path-${route.key}`}>Path</Label>
                  <Input
                    id={`route-path-${route.key}`}
                    placeholder="/"
                    value={route.path}
                    onChange={(event) => updateRoute(route.key, { path: event.target.value })}
                    required
                    disabled={disabled}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`route-origin-${route.key}`}>Origin URL</Label>
                  <Input
                    id={`route-origin-${route.key}`}
                    placeholder="http://localhost:3001"
                    value={route.originUrl}
                    onChange={(event) => updateRoute(route.key, { originUrl: event.target.value })}
                    required
                    disabled={disabled}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border"
                  checked={route.stripPrefix}
                  onChange={(event) => updateRoute(route.key, { stripPrefix: event.target.checked })}
                  disabled={disabled || isRoot}
                />
                <span className={isRoot ? "text-muted-foreground" : undefined}>
                  Strip path prefix before proxying
                  {isRoot ? " (not available for /)" : ""}
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
