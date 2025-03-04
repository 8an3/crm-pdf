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

export default function PDFTool() {
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
  const onSaveAndComplete = async (currentRef: Designer | Form | Viewer | null) => {
    if (currentRef) {
      try {
        const templateData = currentRef.getTemplate()

        if (!templateData?.basePdf || !templateData?.schemas?.[0]) { throw new Error("Invalid template structure"); }

        const templateObj = {
          basePdf: templateData.basePdf,
          columns: templateData.columns || [],
          schemas: templateData.schemas[0]
        };

        const documentJson = JSON.stringify(templateObj, (key, value) => { if (typeof value === 'undefined') { return null; } return value; });
        console.log(documentJson, 'document')

        let intent
        if (pathname.includes("/deal/client")) {
          intent = 'saveViewCreateClient'
          const formData = new FormData();
          formData.append("id", templateId);
          formData.append("document", documentJson);
          formData.append("intent", intent);
          const response = await axios.post(`${API_URL}/document/save`, formData, { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
        } else if (pathname.includes("/signature/client")) {
          const ipResponse = await fetch('https://api.ipify.org?format=json');
          const { ip } = await ipResponse.json();
          const locationResponse = await fetch(`https://ipapi.co/${ip}/json/`);
          const locationData = await locationResponse.json();
          const userAgent = navigator.userAgent;
          const screenResolution = `${window.screen.width}x${window.screen.height}`;
          const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const browserLanguage = navigator.language;
          const isMobile = /Mobi|Android/i.test(navigator.userAgent);
          const deviceType = isMobile ? 'Mobile' : 'Desktop';
          const platform = navigator.platform;
          const referrer = document.referrer;
          const timestamp = new Date().toISOString();
          const meta = {
            userAgent: userAgent,
            ip: ip,
            locationData: locationData,
            screenResolution: screenResolution,
            timeZone: timeZone,
            browserLanguage: browserLanguage,
            deviceType: deviceType,
            platform: platform,
            referrer: referrer,
            timestamp: timestamp,
          };
      
          console.log('Collected Metadata:', meta);
          const inputs =
            typeof (currentRef as Viewer | Form).getInputs === 'function'
              ? (currentRef as Viewer | Form).getInputs()
              : getInputFromTemplate(template);

          intent = 'saveSignatureClient'
          const formData = new FormData();
          formData.append("id", templateId);
          formData.append("inputs", JSON.stringify(inputs));
         formData.append("meta",JSON.stringify(meta));
          formData.append("intent", intent);
          const response = await axios.post(`${API_URL}/document/save`, formData, { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
        } else if (pathname.includes("/viewer/client")) {
          intent = 'closePdfViewer'
          const formData = new FormData();
          formData.append("id", templateId);
          formData.append("document", documentJson);
          formData.append("intent", intent);
          const response = await axios.post(`${API_URL}/document/save`, formData, { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
        } else if (pathname.includes("/deal")) {//
          intent = 'saveViewCreate'
          const formData = new FormData();
          formData.append("name", docName);
          formData.append("docDept", docDept);
          formData.append("id", templateId);
          formData.append("document", documentJson);
          formData.append("intent", intent);
          const response = await axios.post(`${API_URL}/document/save`, formData, { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
        } else if (pathname.includes("/signature")) {//
          intent = 'saveSignatureCreate'
          const formData = new FormData();
          formData.append("name", docName);
          formData.append("docDept", docDept);
          formData.append("id", templateId);
          formData.append("document", documentJson);
          formData.append("intent", intent);
          const response = await axios.post(`${API_URL}/document/save`, formData, { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
        } else if (pathname.includes("/viewer")) {
          intent = 'pdfViewer'
          const formData = new FormData();
          formData.append("name", docName);
          formData.append("docDept", docDept);
          formData.append("id", templateId);
          formData.append("document", documentJson);
          formData.append("intent", intent);
          const response = await axios.post(`${API_URL}/document/save`, formData, { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' } });
        }

        if (response.data.error) { throw new Error(response.data.error); }
        toast.success("Document saved!");
      } catch (error) {
        toast.error(`Error saving document: ${error.message}`);
      }
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
  const navItemsSave: NavItem[] = [
    {
      label: "",
      content: (
        <div className="flex items-center justify-center gap-3">
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
      ),
    }
  ]
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
              setSaveDoc((prev) => !prev)

            }} >
              Complete
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
  function ReviewNavClient({ textTitle }) {
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
            <button className='inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs'
              onClick={async () => {
                await onSaveAndComplete(ui.current)
              }} >
              Complete
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
  function ReviewNavSave({ textTitle }) {

    return (
      <div className="mx-auto px-2 w-full mb-3 mt-4">
        <div className="flex items-center justify-center gap-3">
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
          <button
            className='inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs'
            onClick={() => {
              onSaveAndComplete()
              setSaveDoc((prev) => !prev)
            }}
          >
            Save
          </button>
        </div>
      </div>

    )
  }
  function DealViewerNav() {
    return (
      <div className="mx-auto px-2">
        <div className="relative flex h-16 items-center justify-between">
          <div className=' flex items-center gap-4'>
            <input type="radio" onChange={onChangeMode} id="form" value="form" checked={mode === "form"} />
            <label htmlFor="form">Form</label>
            <input type="radio" onChange={onChangeMode} id="viewer" value="viewer" checked={mode === "viewer"} />
            <label htmlFor="viewer">Viewer</label>
          </div>

          <p className='text-xl'>Deal Viewer</p>

          <div className="flex gap-3">
            <button
              className='inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs'
              onClick={async () => {
                const startTimer = performance.now();
                await generatePDF(designer.current);
                const endTimer = performance.now();
                toast.info(`Generated PDF in ${Math.round(endTimer - startTimer)}ms ⚡️`);
              }}
            >
              Print PDF
            </button>
            <button
              className='inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs'
              onClick={(e) => {
                e.preventDefault();
                const signCustomData = new FormData();
                signCustomData.append("id", templateId);
                signCustomData.append("intent", "closePdfViewer");
                fetcher.submit(signCustomData, { method: "post", action: `${API_URL}/document/save` });
                navigate(-2) /// might need a -2
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>

    )
  }


  let textTitle

  if (pathname.includes("/deal/client")) {
    textTitle = 'saveViewCreateReview and Sign: Required signatures are marked red.Client'
  } else if (pathname.includes("/signature/client")) {
    textTitle = 'Review and Sign: Required signatures are marked red.'
  } else if (pathname.includes("/viewer/client")) {
    textTitle = 'Document Review'
  } else if (pathname.includes("/deal")) {
    textTitle = 'Review and Send To Client'
  } else if (pathname.includes("/signature")) {
    textTitle = 'Review and Send To Client'
  } else if (pathname.includes("/viewer")) {
    textTitle = 'Review and Send To Client'
  }

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

    const finalTemplate = {
      schemas: [template.schemas],
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
      if (pathname.includes("/signature")) {
        builduiSignature()
      } else if (pathname.includes("/viewer")) {
        builduiViewer()
      } else {
        buildui()
      }
    }
  }, [mode, uiRef]);

  return (
    <>
      {pathname.includes("/deal/client") || pathname.includes("/signature/client") || pathname.includes("/viewer/client") ? <ReviewNavClient textTitle={textTitle} /> :
        pathname.includes("/signature") || pathname.includes("/viewer") || pathname.includes("/deal") ?
          saveDoc === false ? <ReviewNav textTitle={textTitle} /> : <ReviewNavSave textTitle={textTitle} />
          : null}
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