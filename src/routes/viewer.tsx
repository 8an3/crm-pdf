import { useRef, useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from 'react-toastify';
import { Template, checkTemplate, getInputFromTemplate, Lang, BLANK_PDF } from "@pdfme/common";
import { Form, Viewer } from "@pdfme/ui";
import { generate } from '@pdfme/generator';
import {
  getFontsData,
  getTemplateById,
  getBlankTemplate,
  handleLoadTemplate,
  generatePDF,
  isJsonString,
  translations,
  cloneDeep,
  getTemplateFromServerViewer,
} from "../helper";
import { getPlugins } from '../plugins';
import { NavItem, NavBar } from "../components/NavBar";
import ExternalButton from "../components/ExternalButton"
import { barcodes, image, multiVariableText } from "@pdfme/schemas";
import { getInputServer, getTemplate, getTemplateFromServer } from '../helper';
import axios from "axios";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type Mode = "form" | "viewer";
const API_URL = import.meta.env.VITE_API_URL;
const VITE_APP_URL = import.meta.env.VITE_APP_URL;

export default function ViewerPage() {
  const uiRef = useRef<HTMLDivElement | null>(null);
  const ui = useRef<Viewer | null>(null);
  const domContainer = document.getElementById('container');
  const { templateId } = useParams();
  const [saveDoc, setSaveDoc] = useState(false);
  const [docName, setDocName] = useState("");
  const [docDept, setDocDept] = useState("Sales");
  const [clientDoc, setClientDoc] = useState();
  const [mode, setMode] = useState<Mode>((localStorage.getItem("mode") as Mode) ?? "form");
  const location = useLocation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const pathname = location.pathname
  const navigate = useNavigate()
  const onChangeMode = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value as Mode;
    setMode(value);
    localStorage.setItem("mode", value);
    buildUi(value);
  };
  const onGetInputs = () => {
    if (ui.current) {
      const inputs = ui.current.getInputs();
      toast.info("Dumped as console.log");
      console.log(inputs);
    }
  };
  const formatDataWithCommas = (jsonString: string) => {
    if (!jsonString) {
      console.error('formatDataWithCommas received undefined or null jsonString');
      return '';
    }

    const lines = jsonString.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (
        ["{", "}", "[", "]"].includes(lines[i].trim()) ||
        lines[i].trim().endsWith(",") ||
        i === lines.length - 1
      ) {
        continue;
      } else if (lines[i + 1] && ["}", "]"].includes(lines[i + 1].trim())) {
        continue;
      } else {
        lines[i] += ',';
      }
    }
    return lines.join('\n');
  };
  const transformInputsData = (data: Record<string, any>) => {
    const transformedObject = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string>);

    return [transformedObject];
  };
 function ReviewNav({ textTitle }) {
    const onChangeMode = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value as Mode;
      setMode(value);
      localStorage.setItem("mode", value);
    };
    return (
      <div className="mx-auto px-2 w-full">
        <div className="relative grid grid-cols-3 h-16 items-center justify-between">
          <div className=' flex items-center gap-4 mr-auto'>
            <input type="radio" onChange={onChangeMode} id="form" value="form" checked={mode === "form"} />
            <label htmlFor="form">Form</label>
            <input type="radio" onChange={onChangeMode} id="viewer" value="viewer" checked={mode === "viewer"} />
            <label htmlFor="viewer">Viewer</label>
          </div>

          <p className='text-lg'>{textTitle}</p>

          <div className="flex gap-3 ml-auto">
            <button
              className='inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs'
              onClick={async () => {
                const startTimer = performance.now();
                await generatePDF(ui.current);
                const endTimer = performance.now();
                toast.info(`Generated PDF in ${Math.round(endTimer - startTimer)}ms ⚡️`);
              }}
            >
              Print PDF
            </button>
            <button className='inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs' onClick={() => {
              navigate(-1)
            }} >
              Cancel
            </button>
          </div>
        </div>
      </div>

    )
  }

  let textTitle = 'Document Review'

  const builduiSignature = useCallback(async () => {
    setSaveDoc(false)
    const template = await getTemplateFromServer(templateId, VITE_APP_URL);
    const finance = await getInputServer(templateId, VITE_APP_URL) || {};
    const transformedData = transformInputsData(finance);
    const inputs = transformedData.length > 0 ? transformedData : [{}];

    const updatedSchemas = template.schemas.map(schema => {
      if (schema.type === "signature") { return schema; }
      const matchingInput = inputs.find(input => input[schema.name] !== undefined);
      return {
        ...schema,
        content: matchingInput ? String(matchingInput[schema.name]) : schema.content,
        readOnly: true,
      };
    });
    const finalTemplate = {
      schemas: [updatedSchemas],
      basePdf: template.basePdf,
      pdfmeVersion: "5.3.5",
    } as Template


    ui.current = new (mode === "form" ? Form : Viewer)({
      domContainer: uiRef.current,
      template: finalTemplate,
      inputs: [{}],
      options: {
        signature: {
          colorBorder: '#ff0000', // Red border
          borderWidth: 2,
          borderStyle: 'solid'
        },
        font: getFontsData(),
        lang: 'en',
        labels: { 'signature.clear': "🗑️" },
        theme: {
          token: {
            colorPrimary: '#ff0000',
          },
          signature: {
            colorBorder: '#ff0000', // Red border
            borderWidth: 2,
            borderStyle: 'solid'
          },

        },
      },
      plugins: getPlugins(),
    });
  }, []);

  const buildui = useCallback(async () => {
    setSaveDoc(false)
    const template = await getTemplateFromServer(templateId, VITE_APP_URL);
    const finance = await getInputServer(templateId, VITE_APP_URL) || {};
    const transformedData = transformInputsData(finance);
    const inputs = transformedData.length > 0 ? transformedData : [{}];

    const updatedSchemas = template.schemas.map(schema => {
      if (schema.type === "signature") { return schema; }
      const matchingInput = inputs.find(input => input[schema.name] !== undefined);
      return {
        ...schema,
        content: matchingInput ? String(matchingInput[schema.name]) : schema.content,
        readOnly: true,
      };
    });
    const finalTemplate = {
      schemas: [updatedSchemas],
      basePdf: template.basePdf,
      pdfmeVersion: "5.3.5",
    } as Template


    ui.current = new (mode === "form" ? Form : Viewer)({
      domContainer: uiRef.current,
      template: finalTemplate,
      inputs: [{}],
      options: {
        font: getFontsData(),
        lang: 'en',
        labels: { 'signature.clear': "🗑️" },
        theme: {
          token: { colorPrimary: '#25c2a0', },
        },
      },
      plugins: getPlugins(),
    });
  }, []);

  const builduiViewer = useCallback(async () => {
    setSaveDoc(false)
    const template = await getTemplateFromServerViewer(templateId, VITE_APP_URL);
    const finance = await getInputServer(templateId, VITE_APP_URL) || {};
    const transformedData = transformInputsData(finance);
    const inputs = transformedData.length > 0 ? transformedData : [{}];

    const updatedSchemas = template.schemas.map(schema => {
        const matchingInput = inputs.find(input => input["0"] && input["0"][schema.name] !== undefined);
        if (schema.type === "signature" && matchingInput) {
          return {
            ...schema,
            content: matchingInput["0"][schema.name], 
            readOnly: true,
          };
        }
        return {
          ...schema,
          content: matchingInput ? String(matchingInput["0"][schema.name]) : schema.content,
          readOnly: true,
        };
      });
      
      // Log the final updated schemas
      console.log("Updated Schemas:", updatedSchemas);
    console.log(updatedSchemas,inputs)
    const finalTemplate = {
      schemas: [updatedSchemas],
      basePdf: template.basePdf,
      pdfmeVersion: "5.3.5",
    } as Template



    ui.current = new (mode === "form" ? Form : Viewer)({
      domContainer: uiRef.current,
      template: finalTemplate,
      inputs: [{}],
      options: {
        font: getFontsData(),
        lang: 'en',
        labels: { 'signature.clear': "🗑️" },
        theme: {
          token: { colorPrimary: '#25c2a0', },
        },
      },
      plugins: getPlugins(),
    });
  }, []);

  useEffect(() => {
    if (uiRef.current) {
        builduiViewer()
    }
  }, [mode, uiRef]);

  return (
    <>
 <ReviewNav textTitle={textTitle} />
      <div ref={uiRef} className="flex-1 w-full" />
    </>
  );
}
/**  function ReviewNavSave() {
    const onChangeMode = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value as Mode;
      setMode(value);
      localStorage.setItem("mode", value);
    };
    return (
      <div className="flex items-center justify-center gap-3 mx-auto">
        <div className="grid w-full max-w-sm items-center">
          <label className='font-semibold'>Document Name</label>
          <input onChange={(e) => { setDocName(e.currentTarget.value); }} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" />
        </div>
        <div className="grid w-full max-w-sm items-center">
          <label className='font-semibold'>Dept</label>
          <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" onChange={(e) => { setDocDept(e.currentTarget.value); }} />
        </div>
        <button
          className='inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs'
          onClick={() => {
            onSaveTemplate(templates[0])
            setSaveDoc((prev) => !prev)
          }}
        >
          Save
        </button>
      </div>

    )
  } */