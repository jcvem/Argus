"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface WorkspaceItem {
  id: string;
  name: string;
  type: string;
  badge?: string;
  description?: string;
}

export const DEFAULT_WORKSPACES: WorkspaceItem[] = [
  {
    id: "argus-core",
    name: "Argus Core Operations",
    type: "Production Control Plane",
    badge: "ACTIVE",
    description: "Primary enterprise data protection & view synthesis workspace",
  },
  {
    id: "redactcore-local",
    name: "RedactCore Daemon Local",
    type: "Local Daemon · Port 8000",
    description: "Developer testing environment with local policy simulation",
  },
  {
    id: "enterprise-vault",
    name: "Enterprise Prod Vault",
    type: "Multi-tenant Isolated",
    description: "High-security zero-retention regulatory enclave",
  },
];

interface WorkspaceContextType {
  workspaces: WorkspaceItem[];
  selectedWorkspace: WorkspaceItem;
  selectWorkspace: (workspaceId: string) => void;
  addWorkspace: (workspace: Omit<WorkspaceItem, "id">) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>(DEFAULT_WORKSPACES);
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceItem>(DEFAULT_WORKSPACES[0]);

  useEffect(() => {
    try {
      const savedId = localStorage.getItem("argus_selected_workspace_id");
      if (savedId) {
        const found = workspaces.find((w) => w.id === savedId);
        if (found) {
          setSelectedWorkspace(found);
        }
      }
    } catch {
      // LocalStorage may fail in restricted sandboxes
    }
  }, [workspaces]);

  const selectWorkspace = (workspaceId: string) => {
    const found = workspaces.find((w) => w.id === workspaceId);
    if (found) {
      setSelectedWorkspace(found);
      try {
        localStorage.setItem("argus_selected_workspace_id", found.id);
      } catch {
        // Ignore
      }
    }
  };

  const addWorkspace = (workspace: Omit<WorkspaceItem, "id">) => {
    const newWs: WorkspaceItem = {
      ...workspace,
      id: `ws-${Date.now()}`,
    };
    const updated = [...workspaces, newWs];
    setWorkspaces(updated);
    setSelectedWorkspace(newWs);
    try {
      localStorage.setItem("argus_selected_workspace_id", newWs.id);
    } catch {
      // Ignore
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        selectedWorkspace,
        selectWorkspace,
        addWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    return {
      workspaces: DEFAULT_WORKSPACES,
      selectedWorkspace: DEFAULT_WORKSPACES[0],
      selectWorkspace: () => {},
      addWorkspace: () => {},
    };
  }
  return context;
}
