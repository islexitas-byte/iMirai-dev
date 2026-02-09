import { useEffect, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { RefreshCcw, Trash2, X, PlusSquare} from "lucide-react";
import type { LoginUser } from "../pages/LoginPage";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { ROLE_PERMISSIONS } from "../pages/permission";
const BACKEND_BASE_URL = "http://127.0.0.1:8000";
type KnowledgeRow = {
  CONTENT_ID: number;
  DOCUMENT_CONTENT: string;
  SOURCE_FILE: string;
  CATEGORY: string;
  CREATE_DATE?: string;
};

export function hasPermission(
  role: string,
  action: "delete" | "add" | "refresh"
) {
  const allowed =
    ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]?.[action] ?? false;

  console.log(
    `[PERMISSION CHECK] role=${role}, action=${action}, allowed=${allowed}`
  );

  return allowed;
}


export default function KnowledgeSources({
  // MY CHANGES
    currentUser,
  }: {
    currentUser: LoginUser;
  }) {
    // 
  const [rowData, setRowData] = useState<KnowledgeRow[]>([]);
  const [filterText, setFilterText] = useState("");
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [fullContent, setFullContent] = useState("");
  const [loading] = useState(false);
  const gridRef = useRef<AgGridReact<KnowledgeRow>>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<"file" | "text">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [plainText, setPlainText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultContentId, setResultContentId] = useState<number | null>(null);
  const [resultMessage, setResultMessage] = useState("");
  // MY CHANGES
  // const userRole = currentUser?.role?.trim();
  const userRole = currentUser?.role?.trim().toLowerCase();
  console.log("Fetching data for role:", userRole);
  console.log("CURRENT USER IN KnowledgeSources:", currentUser);
  console.log("Fetching data for role:", userRole);
  if (!userRole) {
    return <div className="p-4">Loading user role...</div>;
  }
  console.log("USER ROLE SENT TO API:", userRole);

  // const [rowData, setRowData] = useState<KnowledgeRow[]>([]);
  // const gridRef = useRef<AgGridReact<KnowledgeRow>>(null);
  // ...other useState hooks

  /* =========================
     ROLE RESOLUTION (ADD HERE)
     ========================= */
  
  console.log("[USER ROLE]", userRole);

  const role = userRole ?? "viewer";

  if (!userRole) {
    console.log("[ROLE] Waiting for user role...");
    return <div className="p-4">Loading user role...</div>;
  }

  const handleDelete = () => {
    console.log("[DELETE] Delete triggered by role:", role);
  
    const api = gridRef.current?.api;
    if (!api) {
      console.warn("[DELETE] Grid API not ready");
      return;
    }
  
    const selectedRows = api.getSelectedRows();
    console.log("[DELETE] Selected rows:", selectedRows);
  
    if (selectedRows.length === 0) {
      alert("Select rows to delete.");
      return;
    }
  
    // Frontend removal (API call can be added later)
    api.applyTransaction({ remove: selectedRows });
  
    console.log(
      `[DELETE] Deleted ${selectedRows.length} rows (frontend only)`
    );
  };
  
  // ================================================

  /* =========================
     DATA LOADING
     ========================= */
      // MY CHANGES
     const loadData = async () => {
      if (!currentUser || !currentUser.role) {
        console.log("Waiting for user role...");
        return;
      }
    
      const userRole = currentUser.role.toLowerCase();
      
    
      try {
        const res = await fetch(
          `${BACKEND_BASE_URL}/api/knowledge-sources?role=${encodeURIComponent(userRole)}`,
          {
            method: "GET",
            credentials: "include",
          }
        );
    
        const data = await res.json();
        console.log("DATA RECEIVED:", data);
        setRowData(data);
      } catch (e) {
        console.error("Fetch failed", e);
      }
    };
    

  useEffect(() => {
    loadData();
  }, [currentUser]);
  // 

  /* =========================
     SQL STYLE FILTER
     ========================= */

  const applySqlFilter = () => {
    const api = gridRef.current?.api;
    if (!api || !selectedColumn) return;

    const raw = filterText.trim();

    // Supports:
    // COL = 'abc'
    // COL != 'abc'
    // COL LIKE '%abc%'

    const match = raw.match(/^(\w+)\s*(=|!=|LIKE)\s*'(.+)'$/i);

    if (!match) {
      alert(
        "Invalid filter format.\nUse: COLUMN = 'value' or COLUMN LIKE '%value%'"
      );
      return;
    }

    const [, col, op, value] = match;

    if (col !== selectedColumn) {
      alert("Filter column does not match selected column.");
      return;
    }

    let model: any = null;

    if (op.toUpperCase() === "LIKE") {
      model = { type: "contains", filter: value.replace(/%/g, "") };
    } else if (op === "=") {
      model = { type: "equals", filter: value };
    } else if (op === "!=") {
      model = { type: "notEqual", filter: value };
    }

    api.setFilterModel({ [col]: model });
    api.onFilterChanged();
  };

  /* =========================
     GRID COLUMNS
     ========================= */

  const columnDefs: ColDef[] = [
    {
      headerName: "",
      width: 50,
      pinned: "left",
      valueGetter: "node.rowIndex + 1",
      sortable: false,
      filter: false,
    },
    {
      field: "CONTENT_ID",
      headerName: "CONTENT_ID",
      sortable: false,
      filter: "agNumberColumnFilter",
    },
    {
      field: "DOCUMENT_CONTENT",
      headerName: "DOCUMENT_CONTENT",
      sortable: true,
      filter: "agTextColumnFilter",
      flex: 2,
      cellRenderer: (params: any) => {
        const text = params.value || "";
        return (
          <span title="Double-click to view full content">
            {text.length > 120 ? text.slice(0, 120) + "..." : text}
          </span>
        );
      },
    },
    {
      field: "SOURCE_FILE",
      headerName: "SOURCE_FILE",
      sortable: true,
      filter: "agTextColumnFilter",
      cellStyle: { textAlign: "left" }
    },
    {
      field: "CATEGORY",
      headerName: "CATEGORY",
      sortable: true,
      filter: "agTextColumnFilter",
      cellStyle: { textAlign: "left" }
    },
    {
      field: "CREATE_DATE",
      headerName: "CREATE_DATE",
      sortable: true,
      filter: "agTextColumnFilter",
      cellStyle: { textAlign: "left" }
    },
    {
      field: "STATUS",
      headerName: "STATUS",
      sortable: true,
      filter: "agTextColumnFilter",
      cellStyle: { textAlign: "left" }
    },
  ];

  /* =========================
     DELETE ROWS
     ========================= */

  // const onDeleteRows = () => {
  //   const api = gridRef.current?.api;
  //   if (!api) return;

  //   const selected = api.getSelectedRows();
  //   if (selected.length === 0) {
  //     alert("Select rows to delete.");
  //     return;
  //   }

  //   api.applyTransaction({ remove: selected });
  // };

  /* =========================
     ENTERPRISE LOADER
     ========================= */

  const EnterpriseLoader = () => (
    <div className="flex flex-col items-center gap-3">
      <div className="enterprise-bar">
        <div className="enterprise-bar-fill" />
      </div>
      <div className="enterprise-loader-text">
        Loading Knowledge Sources
      </div>
    </div>
  );
  const submitNewEntry = async () => {
    setSubmitting(true);

    try {
      let body: FormData | string;
      let headers: any = {};

      if (addMode === "file") {
        if (!selectedFile) {
          alert("Please select a file.");
          setSubmitting(false);
          return;
        }

        const form = new FormData();
        form.append("type", "file");
        form.append("file", selectedFile);
        body = form;
      } else {
        const words = plainText.trim().split(/\s+/).length;
        if (words > 5000) {
          alert("Plain text cannot exceed 5000 words.");
          setSubmitting(false);
          return;
        }

        body = JSON.stringify({
          type: "text",
          content: plainText,
        });

        headers["Content-Type"] = "application/json";
      }

      const res = await fetch(`${BACKEND_BASE_URL}/add-documents`, {
        method: "POST",
        body,
        headers,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();

      setShowAddModal(false);
      setSelectedFile(null);
      setPlainText("");

      // 🔑 show result modal
      setResultContentId(data.Content_File);
      setResultMessage(data.message);
      setShowResultModal(true);

      // refresh grid
      loadData();

    } catch (e) {
      console.error(e);
      alert("Failed to add document.");
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================
     RENDER
     ========================= */

  return (
    <div className="h-full w-full bg-slate-50 flex flex-col">

      {/* ===== TOOLBAR ===== */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100 border-b border-slate-400">

        {/* LEFT ACTIONS */}
        <div className="flex items-center gap-2">
          {/* ADD ENTRY */}
          {/* <button
            onClick={() => setShowAddModal(true)}
            className="toolbar-btn"
            title="Add new entry"
          >
            <PlusSquare size={18} />
          </button> */}
          {hasPermission(role, "add") && (
            <button
              onClick={() => {
                console.log("[ADD] Add button clicked by role:", role);
                setShowAddModal(true);
              }}
              className="toolbar-btn"
              title="Add New Entry"
            >
              <PlusSquare size={18} />
            </button>
          )}


          {/* REFRESH */}
          {/* <button
            onClick={loadData}
            className="toolbar-btn"
            title="Refresh"
          >
            <RefreshCcw size={16} />
          </button> */}
          {hasPermission(role, "refresh") && (
            <button
              onClick={() => {
                console.log("[REFRESH] Refresh clicked by role:", role);
                loadData();
              }}
              className="toolbar-btn"
              title="Refresh"
            >
              <RefreshCcw size={16} />
            </button>
          )}


          {/* DELETE */}
          {/* <button
            onClick={onDeleteRows}
            className="toolbar-btn text-red-600"
            title="Delete selected rows"
          >
            <Trash2 size={16} />
          </button> */}
          {hasPermission(role, "delete") && (
            <button
              onClick={handleDelete}
              className="toolbar-btn text-red-600"
              title="Delete Selected Rows"
            >
              <Trash2 size={16} />
            </button>
          )}

          
        </div>

        {/* FILTER BAR */}
        <div className="flex items-center gap-2 flex-1 mx-4 max-w-3xl">
          <span className="text-sm font-medium text-slate-700">Filter:</span>

          <div className="relative flex items-center w-full">
            <input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySqlFilter()}
              placeholder={
                selectedColumn
                  ? `${selectedColumn} = 'value'`
                  : "Select a column and type condition..."
              }
              className="sql-filter-input"
            />

            <button
              onClick={() => setShowColumnMenu((s) => !s)}
              className="sql-filter-arrow"
              title="Choose column"
            >
              ▾
            </button>

            {showColumnMenu && (
              <div className="sql-filter-dropdown">
                {columnDefs
                  .filter((c) => c.field)
                  .map((c) => (
                    <div
                      key={c.field}
                      onClick={() => {
                        setSelectedColumn(c.field as string);
                        setFilterText(`${c.field}`);
                        setShowColumnMenu(false);
                      }}
                      className="sql-filter-item"
                    >
                      {c.field}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="w-16" />
      </div>

      {/* ===== MODAL ===== */}
      {showContentModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[70%] max-h-[80%] rounded shadow-lg flex flex-col">

            <div className="flex justify-between items-center px-4 py-2 border-b">
              <h2 className="text-sm font-semibold">Document Content</h2>
              <button
                onClick={() => setShowContentModal(false)}
                className="toolbar-btn"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 overflow-auto text-sm whitespace-pre-wrap">
              {fullContent}
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[600px] rounded shadow-lg flex flex-col">

            {/* HEADER */}
            <div className="flex justify-between items-center px-4 py-2 border-b">
              <h2 className="text-sm font-semibold">Add New Entry</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="toolbar-btn"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* BODY */}
            <div className="p-4 space-y-4">

              {/* MODE SELECT */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Input Type
                </label>
                <select
                  value={addMode}
                  onChange={(e) => setAddMode(e.target.value as "file" | "text")}
                  className="mt-1 w-full border rounded px-2 py-1 text-sm"
                >
                  <option value="file">File</option>
                  <option value="text">Plain Text</option>
                </select>
              </div>

              {/* FILE MODE */}
              {addMode === "file" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Upload File
                  </label>

                  <div
                    className="mt-2 border-2 border-dashed rounded p-6 text-center text-sm text-slate-600 cursor-pointer hover:bg-slate-50"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files[0];
                      if (f) setSelectedFile(f);
                    }}
                    onClick={() =>
                      document.getElementById("fileInput")?.click()
                    }
                  >
                    {selectedFile
                      ? selectedFile.name
                      : "Drag & drop file here or click to select"}
                  </div>

                  <input
                    id="fileInput"
                    type="file"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setSelectedFile(f);
                    }}
                  />
                </div>
              )}

              {/* TEXT MODE */}
              {addMode === "text" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Plain Text (max 5000 words)
                  </label>

                  <textarea
                    value={plainText}
                    onChange={(e) => setPlainText(e.target.value)}
                    rows={8}
                    className="mt-1 w-full border rounded px-2 py-1 text-sm resize-none"
                    placeholder="Enter your content here..."
                  />

                  <div className="mt-1 text-xs text-slate-500">
                    Words: {plainText.trim() ? plainText.trim().split(/\s+/).length : 0} / 5000
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-2 px-4 py-3 border-t">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1 text-sm border rounded"
              >
                Cancel
              </button>
              <button
                onClick={submitNewEntry}
                disabled={submitting}
                className="px-3 py-1 text-sm bg-slate-800 text-white rounded disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showResultModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[480px] rounded shadow-lg flex flex-col">

            {/* HEADER */}
            <div className="flex justify-between items-center px-4 py-2 border-b">
              <h2 className="text-sm font-semibold">Submission Started</h2>
              <button
                onClick={() => setShowResultModal(false)}
                className="toolbar-btn"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* BODY */}
            <div className="p-4 space-y-3 text-sm text-slate-700">

              <div>
                <div className="font-medium text-slate-800">
                  Content File Name
                </div>

                <div className="mt-1 flex items-center gap-2">
                  <input
                    value={resultContentId ?? ""}
                    readOnly
                    className="flex-1 border rounded px-2 py-1 text-sm bg-slate-50"
                  />

                  <button
                    onClick={() => {
                      if (resultContentId !== null) {
                        navigator.clipboard.writeText(
                          String(resultContentId)
                        );
                      }
                    }}
                    className="px-2 py-1 text-sm border rounded hover:bg-slate-100"
                    title="Copy Content ID"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="text-slate-600">
                {resultMessage}
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end px-4 py-3 border-t">
              <button
                onClick={() => setShowResultModal(false)}
                className="px-3 py-1 text-sm bg-slate-800 text-white rounded"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== GRID AREA ===== */}
      <div className="flex-1 relative">

        {/* LOADER (scoped only to grid, not sidebar) */}
        {loading && (
          <div className="absolute inset-0 bg-white/60
                          flex items-center justify-center z-40">
            <EnterpriseLoader />
          </div>
        )}

        <div className={`ag-theme-alpine h-full w-full ${loading ? "grid-loading" : ""}`}>
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            rowSelection="multiple"

            defaultColDef={{
              resizable: true,
              sortable: true,
              filter: true,
            }}

            enableCellTextSelection={true}
            suppressRowClickSelection={false}
            animateRows={true}

            sortingOrder={["asc", "desc", null]}
            suppressMultiSort={true}

            onCellDoubleClicked={(params) => {
              if (params.colDef.field !== "DOCUMENT_CONTENT") return;

              const contentId = params.data.CONTENT_ID;

              fetch(
                `${BACKEND_BASE_URL}/api/knowledge-sources/${contentId}/content`
              )
                .then((r) => r.text())
                .then((text) => {
                  setFullContent(text);
                  setShowContentModal(true);
                })
                .catch((err) => {
                  console.error(err);
                  alert("Unable to load document content.");
                });
            }}
          />
        </div>
      </div>
    </div>
  );
}
