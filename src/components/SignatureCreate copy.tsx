import { useRef, useEffect, useCallback, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { toast } from 'react-toastify';
import { cloneDeep, Template, checkTemplate, Lang, isBlankPdf } from "@pdfme/common";
import { Designer } from "@pdfme/ui";
import {
  getFontsData,
  getTemplateById,
  getTemplate,
  readFile,
  handleLoadTemplate,
  generatePDF,
  downloadJsonFile,
  translations,
  getFinanceServer,
} from "../helper";
import { getPlugins } from '../plugins';
import { NavBar, NavItem } from "./NavBar";
import levesixFront from "./documents/levesixFront.json";
import levesixBack from "./documents/levesixBack.json";
import fileFrontTemplate from "./documents/fileFront.json";
import stickyBackTemplate from "./documents/stickyBack.json";
import yelJacket from "./documents/yellowJacket.json";
import workOrder from "./documents/workOrderTemplate.json";
import ucdasheet from "./documents/ucda.json";
import QUEBECATTOURNEYTemplate from "./documents/QUEBECATTOURNEY.json";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
const VITE_APP_URL = import.meta.env.VITE_APP_URL;

export default function DesignerApp() {
  const [searchParams, setSearchParams] = useSearchParams();
  const designerRef = useRef<HTMLDivElement | null>(null);
  const designer = useRef<Designer | null>(null);
  const { templateId, financeId } = useParams();

  const [editingStaticSchemas, setEditingStaticSchemas] = useState(false);
  const [originalTemplate, setOriginalTemplate] = useState<Template | null>(null);

  const [docDept, setDocDept] = useState("");
  const [docName, setDocName] = useState("");
  const [saveDoc, setSaveDoc] = useState(false);
  const [selectedFile, setSelectedFile] = useState();
  const [selectedFile2, setSelectedFile2] = useState();
  const [isFile, setIsfile] = useState(false);
  const [isFile2, setIsfile2] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateList, setTemplateList] = useState<Template[]>([]);
  const [merged, setMerged] = useState();
 
  /**   {
                "name": "signature66",
                "type": "signature",
                "width": 62.5,
                "height": 10.24,
                "content": "",
                "position": {
                    "x": 147.59,
                    "y": 266.26
                },
                "readOnly": false,
                "required": true
            } */
  useEffect(() => {
    async function BuildUI() {
        console.log(templateId, financeId, 'financeId')
  
        const fetchTemp: Template = await getSingTemplateFromServer(templateId, VITE_APP_URL);
        const template = {
          schemas: [fetchTemp.schemas],
          basePdf: fetchTemp.basePdf,
          pdfmeVersion: '5.3.5',
        };
  
        const fetchFinance = async (financeId) => {
          const finance = await getFinanceServer(financeId, VITE_APP_URL);
    
          function mapDataToInputs(data) {
            const inputs = [];
            const inputObj = {};
            for (const [key, value] of Object.entries(data)) { inputObj[key] = String(value); }
            inputs.push(inputObj);
            return inputs;
          }
          const inputs = mapDataToInputs(finance);
          setMerged(inputs);
        };
    
        fetchFinance(financeId);
  console.log(template,'temp')
  console.log(merged,'merged')
        designer.current = new Designer({
          domContainer: designerRef.current,
          template,
         
          options: {
            font: getFontsData(),
            lang: 'en',
            labels: {
              'signature.clear': "🗑️",
            },
            theme: {
              token: { colorPrimary: "#25c2a0" },
            },
            icons: {
              multiVariableText:
                '<svg fill="#000000" width="24px" height="24px" viewBox="0 0 24 24"><path d="M6.643,13.072,17.414,2.3a1.027,1.027,0,0,1,1.452,0L20.7,4.134a1.027,1.027,0,0,1,0,1.452L9.928,16.357,5,18ZM21,20H3a1,1,0,0,0,0,2H21a1,1,0,0,0,0-2Z"/></svg>',
            },
            maxZoom: 250,
          },
          plugins: getPlugins(),
        });
        designer.current.onSaveTemplate(onSaveTemplate);
      }
      if (designerRef.current) {
        BuildUI()
      }
      return () => {
        designer.current?.destroy();
      };
  }, [designerRef]);


  const onChangeBasePDF = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      readFile(e.target.files[0], "dataURL").then(async (basePdf) => {
        if (designer.current) {
          const newTemplate = cloneDeep(designer.current.getTemplate());
          newTemplate.basePdf = basePdf;
          designer.current.updateTemplate(newTemplate);
        }
      });
    }
  };

  const onDownloadTemplate = () => {
    if (designer.current) {
      downloadJsonFile(designer.current.getTemplate(), "template");
      toast.success(
        <div>
          <p>Can you share the template you created? ❤️</p>
          <a
            className="text-blue-500 underline"
            target="_blank"
            rel="noopener noreferrer"
            href="https://pdfme.com/docs/template-contribution-guide"
          >
            See: Template Contribution Guide
          </a>
        </div>
      );
    }
  };

  const onSaveTemplate = async (template?: Template) => {
    if (designer.current) {
      try {
        const templateData = designer.current.getTemplate();

        // Validate template structure
        if (!templateData?.basePdf || !templateData?.schemas?.[0]) {
          throw new Error("Invalid template structure");
        }

        const templateObj = {
          basePdf: templateData.basePdf,
          columns: templateData.columns || [],
          schemas: templateData.schemas[0]
        };

        // Create JSON string with error handling
        const documentJson = JSON.stringify(templateObj, (key, value) => {
          if (typeof value === 'undefined') {
            return null; // Convert undefined to null
          }
          return value;
        });

        const formData = new FormData();
        formData.append("name", docName);
        formData.append("dept", docDept);
        formData.append("document", documentJson);
        formData.append("intent", "saveDocument");

        const response = await axios.post(`${API_URL}/document/save`, formData, {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        if (response.data.error) {
          throw new Error(response.data.error);
        }

        toast.success("Document saved!");
      } catch (error) {
        toast.error(`Error saving document: ${error.message}`);
      }
    }
  };

  const onResetTemplate = () => {
    localStorage.removeItem("template");
    if (designer.current) {
      designer.current.updateTemplate(getTemplate());
    }
  };

  const getTemplateFromServer = async () => {
    try {
      const response = await axios.get(`${API_URL}/documents/get`, {
        withCredentials: true,
      });
      console.log(response, "response");
      const data = response.data;
      console.log(data, "data");

      const templates = data;
      return templates;
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    }
  };


  const getSingTemplateFromServer = async (templateId) => {
    const response = await axios.get(`${VITE_APP_URL}/portal/api/document/get/${templateId}`);
    const data = response.data.document.document;
   // console.log(data, "data");
    return data;
  };

  const toggleEditingStaticSchemas = () => {
    if (!designer.current) return;

    if (!editingStaticSchemas) {
      const currentTemplate = cloneDeep(designer.current.getTemplate());
      if (!isBlankPdf(currentTemplate.basePdf)) {
        toast.error(<div>
          <p>The current template cannot edit the static schema.</p>
          <a
            className="text-blue-500 underline"
            target="_blank"
            rel="noopener noreferrer"
            href="https://pdfme.com/docs/headers-and-footers"
          >
            See: Headers and Footers
          </a>
        </div>);
        return;
      }

      setOriginalTemplate(currentTemplate);

      const { width, height } = currentTemplate.basePdf;
      const staticSchema = currentTemplate.basePdf.staticSchema || [];
      designer.current.updateTemplate({
        ...currentTemplate,
        schemas: [staticSchema],
        basePdf: { width, height, padding: [0, 0, 0, 0] },
      });

      setEditingStaticSchemas(true);

    } else {
      const editedTemplate = designer.current.getTemplate();
      if (!originalTemplate) return;
      const merged = cloneDeep(originalTemplate);
      if (!isBlankPdf(merged.basePdf)) {
        toast.error("Invalid basePdf format");
        return;
      }

      merged.basePdf.staticSchema = editedTemplate.schemas[0];
      designer.current.updateTemplate(merged);

      setOriginalTemplate(null);
      setEditingStaticSchemas(false);
    }
  };

  const onLoadTemplateFromDB = async (
    value: string,
    currentRef: Designer | Form | Viewer | null
  ) => {
    const id = value;
    try {
      const response = await axios.get(`${API_URL}/document/get/${id}`, {
        withCredentials: true,
      });

      let template: Template;
      const doc = JSON.parse(response.data.document);
      console.log(doc.schemas);
      // Directly map the schemas array
      template = {
        basePdf: doc.basePdf,
        columns: doc.columns,
        schemas: [doc.schemas],
      };

      console.log(template, "documentPdf");
      try {
        const templateJson = template;
        template = templateJson as Template;
      } catch {
        // localStorage.removeItem("template");
        console.log("error could not get from db");
      }
      console.log(template, "tempalte");
      getFontsData().then((font) => {
        if (designerRef.current) {
          designer.current = new Designer({
            domContainer: designerRef.current,
            template,
            options: {
              font,
              lang,
              labels: {
                clear: "🗑️", // Add custom labels to consume them in your own plugins
              },
              theme: {
                token: {
                  colorPrimary: "#25c2a0",
                },
              },
              icons: {
                multiVariableText:
                  '<svg fill="#000000" width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6.643,13.072,17.414,2.3a1.027,1.027,0,0,1,1.452,0L20.7,4.134a1.027,1.027,0,0,1,0,1.452L9.928,16.357,5,18ZM21,20H3a1,1,0,0,0,0,2H21a1,1,0,0,0,0-2Z"/></svg>',
              },
            },
            plugins: getPlugins(),
          });
          designer.current.onSaveTemplate(onSaveTemplate);
          designer.current.onChangeTemplate(() => {
            setTemplatePreset(customTemplatePresetKey);
          });
        }
      });
    } catch (error) {
      console.error("Failed to fetch template:", error);
    }
  };

  const onLoadTemplate = async (value) => {
    const templateName = value;
    if (!templateName) return;
    try {
      let template;
      if (templateName === "Quebec - Power of Attourney") {
        template = QUEBECATTOURNEYTemplate;
      } else if (templateName === "File Front") {
        template = fileFrontTemplate;
      } else if (templateName === "LV6 Front") {
        template = levesixFront;
      } else if (templateName === "LV6 Back") {
        template = levesixBack;
      } else if (templateName === "Sticky Back") {
        template = stickyBackTemplate;
      } else if (templateName === "Yellow Jacket") {
        template = yelJacket;
      } else if (templateName === "Work Order") {
        template = workOrder;
      } else if (templateName === "UCDA") {
        template = ucdasheet;
      } else {
        const getTemp = await getTemplateFromServer();
        template = getTemp.find(
          (t: { fileName: string }) => t.fileName === templateName
        );
      }
      if (designer.current) {
        designer.current.updateTemplate(template);
      }
    } catch (e) {
      console.log(e);
      alert(`Failed to load template.
     --------------------------
     ${e}`);
    }
  };


  const navItems: NavItem[] = [
    {
      label: "Edit static schema",
      content: (
        <button
          className={`px-2 py-1 border rounded hover:bg-gray-100 w-full disabled:opacity-50 disabled:cursor-not-allowed`}
          onClick={toggleEditingStaticSchemas}
        >
          {editingStaticSchemas ? "End editing" : "Start editing"}
        </button>
      ),
    },
    {
      label: "",
      content: (
        <div className="flex gap-2">
          <button
            disabled={editingStaticSchemas}
            className={`px-2 py-1 border rounded hover:bg-gray-100 w-full ${editingStaticSchemas ? "opacity-50 cursor-not-allowed" : ""
              }`}
            onClick={onResetTemplate}
          >
            Reset
          </button>
          {saveDoc === false && (
            <button
              className={`px-2 py-1 border rounded hover:bg-gray-100 w-full }`}
              onClick={() => setSaveDoc((prev) => !prev)}
            >
              Save Template
            </button>
          )}
        </div>
      ),
    },
    {
      label: "",
      content: (
        <div className="flex gap-2">
          <button
            disabled={editingStaticSchemas}
            className={`px-2 py-1 border rounded hover:bg-gray-100 w-full ${editingStaticSchemas ? "opacity-50 cursor-not-allowed" : ""
              }`}
            onClick={onDownloadTemplate}
          >
            DL Template
          </button>
          <button
            disabled={editingStaticSchemas}
            className={`px-2 py-1 border rounded hover:bg-gray-100 w-full ${editingStaticSchemas ? "opacity-50 cursor-not-allowed" : ""
              }`}
            onClick={async () => {
              const startTimer = performance.now();
              await generatePDF(designer.current);
              const endTimer = performance.now();
              toast.info(`Generated PDF in ${Math.round(endTimer - startTimer)}ms ⚡️`);
            }}
          >
            Generate PDF
          </button>
        </div>
      ),
    },

  ];
  const navItemsSave: NavItem[] = [
    {
      label: "",
      content: (
        <div className="flex items-center justify-center gap-3">
          <div className="grid w-full max-w-sm items-center">
            <label className='font-semibold'>Document Name</label>
            <input onChange={(e) => { setDocName(e.currentTarget.value); }} className="w-full text-sm border rounded h-7" />
          </div>
          <div className="grid w-full max-w-sm items-center">
            <label className='font-semibold'>Dept</label>
            <input className="w-full text-sm border rounded  h-7" onChange={(e) => { setDocDept(e.currentTarget.value); }} />
          </div>
          <button
            className={`px-2 py-1 border rounded hover:bg-gray-100 w-full mt-5 }`}
            onClick={() => {
              onSaveTemplate(templates[0])
              setSaveDoc((prev) => !prev)
            }}
          >
            Save Template
          </button>
        </div>
      ),
    },
  ]


  const onSaveAndComplete = async () => {
    if (designer.current) {
      try {
        const templateData = designer.current.getTemplate();

        if (!templateData?.basePdf || !templateData?.schemas?.[0]) { throw new Error("Invalid template structure"); }

        const templateObj = {
          basePdf: templateData.basePdf,
          columns: templateData.columns || [],
          schemas: templateData.schemas[0]
        };

        const documentJson = JSON.stringify(templateObj, (key, value) => { if (typeof value === 'undefined') { return null; } return value; });

        const formData = new FormData();
        formData.append("name", docName);
        formData.append("financeId", docFinanceId);
        formData.append("document", documentJson);
        formData.append("intent", "saveSignatureCreate");

        const response = await axios.post(`${API_URL}/document/save`, formData, { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });

        if (response.data.error) { throw new Error(response.data.error); }
        toast.success("Document saved!");
      } catch (error) {
        toast.error(`Error saving document: ${error.message}`);
      }
    }
  };


  return (
    <div>
      {saveDoc === false ? (<NavBar items={navItems} />) : (<NavBar items={navItemsSave} />)}

      <div ref={designerRef} className="flex-1 w-full" />
    </div>
  );
}




