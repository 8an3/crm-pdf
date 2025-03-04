import { useRef, useEffect, useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  getTemplateFromServer,
  getTemplatesFromServer,
} from "../helper";
import { getPlugins } from '../plugins';
import { NavBar, NavItem } from "../components/NavBar";
import levesixFront from "../components/documents/levesixFront.json";
import levesixBack from "../components/documents/levesixBack.json";
import fileFrontTemplate from "../components/documents/fileFront.json";
import stickyBackTemplate from "../components/documents/stickyBack.json";
import yelJacket from "../components/documents/yellowJacket.json";
import workOrder from "../components/documents/workOrderTemplate.json";
import ucdasheet from "../components/documents/ucda.json";
import QUEBECATTOURNEYTemplate from "../components/documents/QUEBECATTOURNEY.json";
import axios from "axios";
import * as React from "react";
import classnames from "classnames";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@radix-ui/react-icons";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";


const API_URL = import.meta.env.VITE_API_URL;
const VITE_APP_URL = import.meta.env.VITE_APP_URL;

export default function DesignerApp() {
  const [searchParams, setSearchParams] = useSearchParams();
  const designerRef = useRef<HTMLDivElement | null>(null);
  const designer = useRef<Designer | null>(null);

  const [editingStaticSchemas, setEditingStaticSchemas] = useState(false);
  const [originalTemplate, setOriginalTemplate] = useState<Template | null>(null);

  const [docDept, setDocDept] = useState("Sales");
  const [docName, setDocName] = useState("");
  const [saveDoc, setSaveDoc] = useState(false);
  const [selectedFile, setSelectedFile] = useState();
  const [selectedFile2, setSelectedFile2] = useState();
  const [isFile, setIsfile] = useState(false);
  const [isFile2, setIsfile2] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateList, setTemplateList] = useState<Template[]>([]);

  useEffect(() => {
    const fetchTemplates = async () => {
      const templatesFromServer = await getTemplatesFromServer(VITE_APP_URL);
      const templateArray = Array.isArray(templatesFromServer)
        ? templatesFromServer
        : [];

      setTemplateList(templateArray);
    };

    fetchTemplates();
  }, []);

  const buildDesigner = useCallback(async () => {
    if (!designerRef.current) return;
    try {
      let template: Template = getTemplate();
      const templateIdFromQuery = searchParams.get("template");
      searchParams.delete("template");
      setSearchParams(searchParams, { replace: true });
      const templateFromLocal = localStorage.getItem("template");

      if (templateIdFromQuery) {
        const templateJson = template
        checkTemplate(templateJson);
        template = templateJson;
        if (!templateFromLocal) {
          localStorage.setItem("template", JSON.stringify(templateJson));
        }
      } else if (templateFromLocal) {
        const templateJson = JSON.parse(templateFromLocal) as Template;
        checkTemplate(templateJson);
        template = templateJson;
      }

      designer.current = new Designer({
        domContainer: designerRef.current,
        template,
        options: {
          signature: {
            colorBorder: '#ff0000', // Red border
            borderWidth: 2,
            borderStyle: 'solid'
          },
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

    } catch {
      localStorage.removeItem("template");
    }
  }, [searchParams, setSearchParams]);

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
      getFontsData1().then((font) => {
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
        const getTemp = await getTemplatesFromServer(VITE_APP_URL);
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
  useEffect(() => {
    if (designerRef.current) { 
      buildDesigner(); 
    }
  }, [designerRef, buildDesigner]);



  const oldTemplates = [
    { name: 'LV6 Front', value: 'LV6 Front', label: 'LV6 Front' },
    { name: 'LV6 Back', value: 'LV6 Back', label: 'LV6 Back' },
    { name: 'Yellow Jacket', value: 'Yellow Jacket', label: 'Yellow Jacket' },
    { name: 'UCDA', value: 'UCDA', label: 'UCDA' },
    { name: 'Sticky Back', value: 'Sticky Back', label: 'Sticky Back' },
    { name: 'File Front', value: 'File Front', label: 'File Front' },
    { name: 'Quebec - Power of Attourney', value: 'Quebec - Power of Attourney', label: 'Quebec - Power of Attourney' },
  ]

  const [selectedOption, setSelectedOption] = useState("LV6 Front");

  function NavItems() {
    return (
      <div className='flex items-center  gap-2 mx-auto  justify-center'>
        <div className="relative ml-3 mt-6">
          <input
            type="file"
            id="file"
            name="file"
            className="opacity-0 absolute inset-0 cursor-pointer"
            onChange={onChangeBasePDF}
          />
          <label
            htmlFor="file"
            className={`h-[33px] cursor-pointer border border-border rounded-md text-foreground bg-background px-2 py-2 inline-block w-[175px] text-foreground
                ${isFile2 === false ? "border-border" : "border-[#3dff3d]"}`}
            style={{ zIndex: -55, }}
          >
            <span className="mr-4">
              {isFile2 === false ? <p>Choose File</p> : <p>{selectedFile2}</p>}
            </span>
          </label>
          <label
            style={{ opacity: 1, zIndex: 55, transition: "all", }}
            className="text-sm absolute left-3 rounded-full -top-3 px-2 bg-background transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-muted-foreground peer-focus:-top-3 peer-focus:text-muted-foreground  text-foreground"
          >
            Change BasePDF
          </label>
        </div>
        <div className="relative ml-3 mt-6">
          <input
            type="file"
            id="file"
            name="file"
            className="opacity-0 absolute inset-0 cursor-pointer h-10"
            onChange={(e) => handleLoadTemplate(e, designer.current)}
          />
          <label
            htmlFor="file"
            className={`h-[33px] cursor-pointer border border-border rounded-md text-foreground bg-background px-2 py-2 inline-block w-[175px] text-foreground
                ${isFile2 === false ? "border-border" : "border-[#3dff3d]"}`}
            style={{ zIndex: -55, }}
          >
            <span className="mr-4">
              {isFile2 === false ? <p>Choose File</p> : <p>{selectedFile2}</p>}
            </span>
          </label>
          <label
            style={{ opacity: 1, zIndex: 55, transition: "all", }}
            className="text-sm absolute left-3 rounded-full -top-3 px-2 bg-background transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-muted-foreground peer-focus:-top-3 peer-focus:text-muted-foreground  text-foreground"
          >
            Load Template
          </label>
        </div>


        <div className="relative">
          <Select
            value={selectedOption}
            onValueChange={(value) => {
              setSelectedOption(value)
              if ([
                "LV6 Front", "LV6 Back", "Yellow Jacket", "Work Order",
                "UCDA", "Sticky Back", "File Front", "Quebec - Power of Attourney"
              ].includes(selectedOption)) {
                onLoadTemplate(selectedOption);
              } else {
                onLoadTemplateFromDB(selectedOption, designer.current);
              }
            }}>

            <SelectTrigger className="h-[33px]">
              <SelectValue placeholder="LV6 Front" />
            </SelectTrigger>
            <SelectContent>
              {oldTemplates.map((item, index) => (
                <SelectItem value={item.label} key={index}>{item.label}</SelectItem>
              ))}
              {templateList.map((item, index) => (
                <SelectItem value={item.id} key={index}> {item.name} </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className=" text-sm absolute left-3 rounded-full -top-3 px-2 bg-background transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-gray-400 peer-focus:-top-3 peer-focus:text-blue-500">
            Templates
          </label>
        </div>

        <Button
          size='sm'
          variant='outline'
          onClick={onResetTemplate} >
          Reset
        </Button>
        <Button
          size='sm'
          variant='outline'
          onClick={() => setSaveDoc((prev) => !prev)} >
          Save Template
        </Button>
        <Button
          size='sm'
          variant='outline'
          onClick={onDownloadTemplate} >
          DL Template
        </Button>
        <Button
          size='sm'
          variant='outline'
          onClick={async () => {
            const startTimer = performance.now();
            await generatePDF(designer.current);
            const endTimer = performance.now();
            toast.info(`Generated PDF in ${Math.round(endTimer - startTimer)}ms ⚡️`);
          }} >
          Generate PDF
        </Button>

      </div>
    )
  }
  const  NavItemsSave1=()=> {
    return (
      <div className='flex items-center  gap-2 mx-auto justify-center'>
        <div className="relative mr-3 ">
          <Input
            defaultValue={docName}
            className='w-full'
            onChange={(e) => { 
              setDocName(e.currentTarget.value);
               }} />
          <label className=" text-sm absolute left-3 rounded-full -top-3 px-2 bg-background transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-gray-400 peer-focus:-top-3 peer-focus:text-blue-500">
            Document Name
          </label>
        </div>

        <div className="relative">
          <Select
            value={docDept}
            onValueChange={(value) => {
              setDocDept(value);
            }}>
            <SelectTrigger className="">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Sales'>Sales</SelectItem>
              <SelectItem value='Service'>Service</SelectItem>
              <SelectItem value='Parts'>Parts</SelectItem>
              <SelectItem value='Accessories'>Accessories</SelectItem>
              <SelectItem value='Office'>Office</SelectItem>
            </SelectContent>
          </Select>
          <label className=" text-sm absolute left-3 rounded-full -top-3 px-2 bg-background transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-gray-400 peer-focus:-top-3 peer-focus:text-blue-500">
            Templates
          </label>
        </div>

        <Button
          size='sm'
          variant='outline'
          onClick={() => {
            onSaveTemplate(templates[0])
            setSaveDoc((prev) => !prev)
          }}>
          Save Template
        </Button>
      </div>
    )
  }
    const navItemsSave: NavItem[] = [
      {
        label: "",
        content: (
          <div className="flex items-center justify-center gap-3">
            <div className="grid w-full max-w-sm items-center">
              <label className='font-semibold'>Document Name</label>
              <input onChange={(e) => { setDocName(e.currentTarget.value); }}  className="flex h- h-[32px]  w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"  />
            </div>
            <div className="grid w-full max-w-sm items-center">
              <label className='font-semibold'>Dept</label>
              <input  className="flex h-[32px] w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"  onChange={(e) => { setDocDept(e.currentTarget.value); }} />
            </div>
            <button
               className='inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs mt-5'
              onClick={() => {
                onSaveTemplate(templates[0])
                setSaveDoc((prev) => !prev)
              }}
            >
              Save 
            </button>
          </div>
        ),
      }
    ]
  return (
    <div>
      {saveDoc === false ? (<NavItems />) : (<NavBar items={navItemsSave} />)}
      <div ref={designerRef} className="flex-1 w-full" />
    </div>
  );
}

