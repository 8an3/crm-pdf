import React, { useEffect, useRef, useState } from "react";
import { cloneDeep, Template, checkTemplate, Lang } from "@pdfme/common";
import { Designer } from "@pdfme/ui";
import { text, image, barcodes } from "@pdfme/schemas";
import {
  getFontsData,
  getTemplatePresets,
  getTemplateByPreset,
  readFile,
  getPlugins,
  handleLoadTemplate,
  generatePDF,
  downloadJsonFile,
  translations,
  qrTemplate,
} from "../components/helper";
import axios from "axios";
import { generate } from "@pdfme/generator";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Card,
  CardFooter,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import {
  SelectContent,
  SelectLabel,
  SelectGroup,
  SelectValue,
  Select,
  SelectTrigger,
  SelectItem,
} from "../components/ui/select";

import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  Copy,
  CreditCard,
  File,
  Home,
  LineChart,
  ListFilter,
  MoreVertical,
  Package,
  Package2,
  PanelLeft,
  Search,
  Plus,
  Settings,
  ShoppingCart,
  Truck,
  User,
  Users2,
  Percent,
  PanelTop,
  Scan,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "../components/ui/tooltip";
import ScanSound from "../images/scan.mp4";
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  NotFoundException,
  ChecksumException,
  FormatException,
} from "@zxing/library";
import { toast } from "sonner";

export function playScanSound() {
  const audio = new Audio(ScanSound);
  audio.play();
}

const API_URL = import.meta.env.VITE_API_URL;

export default function LabelMaker() {
  const [scannedCode, setScannedCode] = useState("");
  const [query, setQuery] = useState("");
  let ref = useRef();
  let formRef = useRef();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);

  /**  const handleSubmit = async (e) => {
    e.preventDefault();
    // This simulates the form submission
    const response = await fetch(`/api/accessories/products/search?q=${query}`);
    const data = await response.json();
    console.log(data);
    setProducts(data);
  }; */

  useEffect(() => {
    const handleSubmit = async () => {
      const response = await axios.get(
        `${API_URL}/accessories/products/search?q=${query}`,
        {
          withCredentials: true,
        }
      );
      console.log(response, "response");
      const data = response.data.result;

      setProducts(data);
    };
    handleSubmit();
  }, [query]);

  async function GetAcc(dealerId) {
    const response = await axios.get(`/portal/accessories/products/search/${dealerId}`);
    if (response.status !== 200) { return { error: "Failed to fetch data." }; }
    //const data = JSON.parse(response.data)
    console.log(response.data, 'fetchUserData')
    const data = response.data
    setAcc(data)
  }

  useEffect(() => {
    if (scannedCode && products.length > 0) {
         const result =  GetAcc(scannedCode)
      setFilteredProducts(result);
    }
  }, [scannedCode, products]);

  const handleSubmitProducts = async (e) => {
    e.preventDefault();
    const formData = new FormData(formRef.current);

    // You can send the form data to the server here
    const response = await fetch("/path-to-submit", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    console.log(data); // Handle the response
  };

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    console.log("ZXing code reader initialized");

    const hints = new Map();
    const formats = [
      BarcodeFormat.PDF_417,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.ITF,
      BarcodeFormat.CODE_128,
      BarcodeFormat.EAN_13,
    ];
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);

    codeReader
      .getVideoInputDevices()
      .then((videoInputDevices) => {
        const sourceSelect = document.getElementById("sourceSelect");
        let selectedDeviceId = videoInputDevices[0].deviceId;

        if (videoInputDevices.length > 1) {
          videoInputDevices.forEach((element) => {
            const sourceOption = document.createElement("option");
            sourceOption.text = element.label;
            sourceOption.value = element.deviceId;
            sourceSelect.appendChild(sourceOption);
          });

          sourceSelect.onchange = () => {
            selectedDeviceId = sourceSelect.value;
          };

          const sourceSelectPanel =
            document.getElementById("sourceSelectPanel");
          sourceSelectPanel.style.display = "block";
        }

        document
          .getElementById("startButton")
          .addEventListener("click", async () => {
            let stopScanning = false;

            while (!stopScanning) {
              try {
                const result = await codeReader.decodeOnceFromVideoDevice(
                  selectedDeviceId,
                  "video",
                  hints
                );
                setScannedCode(result.text);
                playScanSound();
                console.log("result", result);
                await new Promise((resolve) => setTimeout(resolve, 5000));
                codeReader.reset();
              } catch (err) {
                console.error("error", err);
              }
            }
            console.log("Stopped scanning");
          });

        document.getElementById("resetButton").addEventListener("click", () => {
          document.getElementById("result").textContent = "";
          codeReader.reset();
          setScannedCode("");
          console.log("Reset.");
        });

        let listener = (event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "s") {
            //    event.preventDefault();
            codeReader
              .decodeOnceFromVideoDevice(selectedDeviceId, "video", hints)
              .then((result) => {
                console.log(result);
                /// document.getElementById('result').textContent = result.text;
                setScannedCode(result.text);
              })
              .catch((err) => {
                console.error(err);
                //  document.getElementById('result').textContent = err;
              });
          }
          if ((event.metaKey || event.ctrlKey) && event.key === "r") {
            event.preventDefault();
            codeReader.reset();
            setScannedCode("");
            console.log("Reset.");
          }
        };

        window.addEventListener("keydown", listener);
        return () => window.removeEventListener("keydown", listener);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);
  /**  useEffect(() => {
    if (scannedCode) {
      const formData = new FormData();
      formData.append("q", scannedCode);
      search.submit(formData, {
        method: "get",
        action: "/accessories/products/search/id",
      });
    }
  }, [scannedCode]); */

  const [selectedProducts, setSelectedProducts] = useState([]);
  const [quantities, setQuantities] = useState({});

  const handleQuantityChange = (id, quantity) => {
    setQuantities((prev) => ({ ...prev, [id]: quantity }));
  };

  const handleAddToOrder = (product) => {
    const quantity = quantities[product.id] || 1;

    const newProducts = Array.from({ length: quantity }, (_, index) => {
      return {
        name: product.name,
        price: product.price,
        location: product.location,
        dealerId: product.dealerId,
        brand: product.brand,
      };
    });

    setSelectedProducts((prev) => {
      const updatedProducts = [...prev];
      newProducts.forEach((newProduct) => {
        if (
          updatedProducts.length === 0 ||
          Object.keys(updatedProducts[updatedProducts.length - 1]).length / 5 >=
            30
        ) {
          updatedProducts.push({});
        }
        const currentPage = updatedProducts.length - 1;
        const baseIndex =
          Object.keys(updatedProducts[currentPage]).length / 5 + 1;
        updatedProducts[currentPage][`${baseIndex}qrcode`] = newProduct.dealerId;
        updatedProducts[currentPage][`${baseIndex}title`] = newProduct.name;
        updatedProducts[currentPage][`${baseIndex}free1`] = newProduct.brand;
        updatedProducts[currentPage][`${baseIndex}free2`] =
          `$${newProduct.price}`;
        updatedProducts[currentPage][`${baseIndex}free3`] = newProduct.location;
      });
      return updatedProducts;
    });
  };

  const options2 = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    // second: "2-digit",
    //  hour12: false,
    //  timeZoneName: "short",
  };

  // Function to aggregate products for display
  const aggregateProducts = (products) => {
    const productMap = {};

    products.forEach((page) => {
      // Extract unique prefixes dynamically
      const prefixes = Array.from(
        new Set(Object.keys(page).map((key) => key.match(/^[^a-zA-Z]+/)[0]))
      );

      prefixes.forEach((prefix) => {
        const idKey = `${prefix}qrcode`;
        const nameKey = `${prefix}title`;
        const brandKey = `${prefix}free1`;
        const priceKey = `${prefix}free2`;
        const locationKey = `${prefix}free3`;

        if (page[idKey]) {
          const dealerId = page[idKey];
          if (!productMap[dealerId]) {
            productMap[dealerId] = {
              name: page[nameKey],
              location: page[locationKey],
              brand: page[brandKey],
              price: page[priceKey],
              dealerId,
              count: 0,
            };
          }
          productMap[dealerId].count += 1;
        }
      });
    });

    return Object.values(productMap);
  };

  // Displaying aggregated products
  const aggregatedProducts = aggregateProducts(selectedProducts);
  const text = "#fafafa";
  const bg = "#09090b";
  const border = "#27272a";
  console.log(aggregatedProducts, selectedProducts, "checking");
  return (
    <Tabs defaultValue="Labels" className={`m-8 text-[${text}]`}>
      <TabsList className="active:bg-[#09090b]">
        <TabsTrigger
          value="Labels"
          className=" data-[state=active]:bg-[#09090b] data-[state=active]:text-[#fafafa] data-[state=active]:shadow"
        >
          Labels
        </TabsTrigger>
        <TabsTrigger
          className=" data-[state=active]:bg-[#09090b] data-[state=active]:text-[#fafafa] data-[state=active]:shadow"
          value="Label Maker"
        >
          Print Labels
        </TabsTrigger>
      </TabsList>
      <TabsContent value="Labels">
        <div className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-3 xl:grid-cols-3">
          <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
            <Card
              style={{
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
                borderColor: "#27272a",
              }}
              x-chunk="dashboard-05-chunk-3"
              className={`bg-[${bg}] text-[${text}] border-${border}`}
            >
              <CardHeader className="px-7">
                <CardTitle>Labels</CardTitle>
                <CardDescription>
                  <div className="flex justify-between ">
                    <div className="relative mt-auto mr-auto flex-1 md:grow-0">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        name="q"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                        placeholder="Search..."
                        className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px] mb-2"
                        style={{
                          backgroundColor: "var(--background)",
                          color: "var(--foreground)",
                          borderColor: "#27272a",
                        }}
                      />
                    </div>
                    <div className="flex mb-2">
                      <main className="wrapper text-white mx-auto ">
                        <section className="container" id="demo-content">
                          <div className="flex items-center">
                            <div className="flex flex-col items-center  mx-auto">
                              <div
                                className="rounded-[5px] border border-border relative group"
                                style={{
                                  padding: 0,
                                  width: "150px",
                                  maxHeight: "100px",
                                  overflow: "hidden",

                                  backgroundColor: "var(--background)",
                                  color: "var(--foreground)",
                                  borderColor: "#27272a",
                                }}
                              >
                                <video
                                  id="video"
                                  style={{ width: "150px" }}
                                ></video>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 text-sm  bg-primary absolute left-2.5 top-2.5  opacity-0 transition-opacity group-hover:opacity-100 "
                                  id="startButton"
                                >
                                  <Scan className="h-3.5 w-3.5" />
                                  <span className="sr-only sm:not-sr-only text-foreground">
                                    Scan
                                  </span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 text-sm   absolute right-2.5 top-2.5  opacity-0 transition-opacity group-hover:opacity-100 "
                                  id="resetButton"
                                >
                                  <Scan className="h-3.5 w-3.5" />
                                  <span className="sr-only sm:not-sr-only text-foreground">
                                    Reset
                                  </span>
                                </Button>
                                <div
                                  id="sourceSelectPanel"
                                  style={{ display: "none" }}
                                >
                                  <select
                                    id="sourceSelect"
                                    className="b-rounded-[5px] px-3 py-1 bg-background text-foreground border-border border   opacity-0 transition-opacity group-hover:opacity-100 "
                                    style={{ maxWidth: "150px" }}
                                  ></select>
                                </div>
                              </div>
                              <div style={{ display: "none" }}>
                                <div
                                  style={{
                                    padding: 0,
                                    width: "100px",
                                    maxHeight: "100px",
                                    overflow: "hidden",
                                    border: "1px solid gray",
                                  }}
                                >
                                  <video
                                    id="video"
                                    style={{ width: "100px" }}
                                  ></video>
                                </div>
                                <input
                                  className="text-background bg-background border-background"
                                  type="file"
                                  id="imageUploadButton"
                                  accept="image/*"
                                  style={{ display: "inline-block" }}
                                />
                                <label
                                  className="text-background"
                                  htmlFor="sourceSelect"
                                >
                                  Change video source:
                                </label>
                                <label className="text-background">
                                  Result:
                                </label>
                                <pre>
                                  <code
                                    className="text-background"
                                    id="result"
                                  ></code>
                                </pre>
                                <form
                                  method="post"
                                  ref={formRef}
                                  onSubmit={handleSubmitProducts}
                                  className="mr-auto"
                                >
                                  <div className="relative ml-auto flex-1 md:grow-0">
                                    <input
                                      name="intent"
                                      defaultValue="updateOrder"
                                      type="hidden"
                                    />
                                    <input
                                      name="accessoryId"
                                      defaultValue={scannedCode}
                                      type="hidden"
                                    />
                                    <Input
                                      name="searchQuery"
                                      type="search"
                                      placeholder="Search..."
                                      className="w-full rounded-lg bg-background pl-8 max-w-[400px]"
                                    />
                                  </div>
                                </form>
                              </div>
                            </div>
                          </div>
                        </section>
                      </main>
                    </div>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-[600px] h-auto overflow-y-auto">
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow
                        style={{
                          backgroundColor: "var(--background)",
                          color: "var(--foreground)",
                          borderColor: "#27272a",
                        }}
                        className="border-border"
                      >
                        <TableHead>Name & Price</TableHead>
                        <TableHead className="text-center">Location</TableHead>
                        <TableHead className="text-center">ID</TableHead>
                        <TableHead className="text-center">Quantity</TableHead>
                        <TableHead className="text-center">
                          Add To Order
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products &&
                        products.map((result, index) => (
                          <TableRow
                            style={{
                              backgroundColor: "var(--background)",
                              color: "var(--foreground)",
                              borderColor: "#27272a",
                            }}
                            key={index}
                            className="hover:bg-accent border-border"
                          >
                            <TableCell>
                              <div>{result.name}</div>
                              <div className="text-muted-foreground">
                                ${result.price}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {result.location}
                            </TableCell>
                            <TableCell className="text-center">
                              {result.id}
                            </TableCell>
                            <TableCell>
                              <Input
                                style={{
                                  backgroundColor: "var(--background)",
                                  color: "var(--foreground)",
                                  borderColor: "#27272a",
                                }}
                                type="number"
                                min="1"
                                className="w-[50px] mx-auto"
                                value={quantities[result.id] || 1}
                                onChange={(e) =>
                                  handleQuantityChange(
                                    result.id,
                                    parseInt(e.target.value)
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell className="flex justify-center">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className=""
                                      onClick={() => handleAddToOrder(result)}
                                    >
                                      <Plus className="h-5 w-5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="right">
                                    Add To Labels
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card
              style={{
                zIndex: -55,
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
                borderColor: "#27272a",
              }}
              className={`bg-[${bg}] text-[${text}] border-${border}`}
              x-chunk="dashboard-05-chunk-4"
            >
              <CardHeader className={`flex flex-row items-start bg-[${bg}]`}>
                <div className="grid gap-0.5">
                  <CardTitle className="group flex items-center gap-2 text-lg">
                    Labels To Be Printed
                  </CardTitle>
                  <CardDescription></CardDescription>
                </div>
              </CardHeader>
              <CardContent  className={`p-6 text-sm max-h-[665px] h-auto overflow-y-auto  border-${border}`}   >
                <div className="grid gap-3">
                  <div className="font-semibold">Order Details</div>
                  <ul className="grid gap-3 max-h-[300px] h-auto overflow-y-auto">
                    {aggregatedProducts &&
                      aggregatedProducts.map((result, index) => (
                        <li   className="flex items-center justify-between"  key={index}  >
                          <div>
                            <div className="grid grid-cols-1">
                              <p>{result.name}</p>
                              <p className="text-muted-foreground">
                                {result.price}
                              </p>
                            </div>
                          </div>
                          <div>
                            <div className="text-right">
                              {result.location} x {result.count} qty
                            </div>
                            <div className="text-right text-muted-foreground">
                              {result.id}
                            </div>
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              </CardContent>
              <CardFooter
                style={{
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                  borderColor: "#27272a",
                }}
                className={`flex flex-row items-center border-t border-${border} bg-muted/50 px-6 py-3`}
              >
                <div className="text-xs text-muted-foreground">
                  Current Time{" "}
                  <time dateTime="2023-11-23">
                    {new Date().toLocaleDateString("en-US", options2)}
                  </time>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="Label Maker" className='w-[90vw] max-w-[90vw]'>
       
            <PrintButton inputs={selectedProducts} />
      </TabsContent>
    </Tabs>
  );
}

export const links: LinksFunction = () => [
  { rel: "icon", type: "image/svg", href: "/favicons/calendar.svg" },
];

export const meta = () => {
  return [
    { title: "Label Printer || PAC || Dealer Sales Assistant" },
    {
      property: "og:title",
      content: "Your bespoke CRM.",
    },
    {
      name: "description",
      content:
        "To help sales people achieve more. Every automotive dealer needs help, especialy the sales staff. Dealer Sales Assistant will help you close more deals more efficiently.",
      keywords: "Automotive Sales, dealership sales, automotive CRM",
    },
  ];
};

const headerHeight = 65;

export function PrintButton({ inputs }) {
  const designerRef = useRef<HTMLDivElement | null>(null);
  const designer = useRef<Designer | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateData, setTemplate] = useState<Template | null>(null);
  console.log(inputs, "inputs");
  const [templatePreset, setTemplatePreset] = useState<string>();
  const [financeId, setFinanceId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [docDept, setDocDept] = useState("");
  const [docName, setDocName] = useState("");
  const [saveDoc, setSaveDoc] = useState(false);
  const [selectedFile, setSelectedFile] = useState();
  const [selectedFile2, setSelectedFile2] = useState();
  const [isFile, setIsfile] = useState(false);
  const [isFile2, setIsfile2] = useState(false);
  const [templateList, setTemplateList] = useState<Template[]>([]);
  const [merged, setMerged] = useState();
  useEffect(() => {
    let template: Template = qrTemplate();
    setTemplate(template);
    try {
      const templateString = template;
      const templateJson = templateString
        ? JSON.parse(templateString)
        : qrTemplate();
      checkTemplate(templateJson);
      template = templateJson as Template;
    } catch {
      localStorage.removeItem("template");
    }

    getFontsData().then((font) => {
      if (designerRef.current) {
        designer.current = new Designer({
          domContainer: designerRef.current,
          template,
          options: { font },
          plugins: getPlugins(),
        });
        designer.current.onSaveTemplate(onSaveTemplate);
      }
    });
    return () => {
      if (designer.current) {
        designer.current.destroy();
      }
    };
  }, [designerRef]);

  const onSaveTemplate = async (template?: Template) => {
    if (designer.current) {
      console.log(docDept, docName, "name and dept");

      localStorage.setItem(
        "template",
        JSON.stringify(template || designer.current.getTemplate())
      );

      const templateData = designer.current.getTemplate();
      const basePdf = templateData.basePdf;
      const columns = templateData.columns;
      const schemas = templateData.schemas[0];

      const templateObj = {
        basePdf: `${basePdf}`,
        columns: columns,
        schemas: schemas,
      };

      const formData = new FormData();
      formData.append("name", docName);
      formData.append("dept", docDept);
      formData.append("document", JSON.stringify(templateObj));
      formData.append("intent", "saveDocument");

      try {
        const response = await axios.post(
          `${API_URL}/api/document/save`,
          formData, // The body of the request
          {
            withCredentials: true, // Sends cookies
          }
        );

        if (!response.ok) {
          throw new Error("Failed to save document");
        }

        toast.success("Document saved!");
      } catch (error) {
        toast.error("Error saving document: " + error.message);
      }
    }
  };

  const getTemplateFromServer = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/documents/get`, {
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

  const template = templateData;

  async function GeneratePDFWInputs(
    inputs: any[],
    currentRef: Designer | Form | Viewer | null
  ) {
    if (!currentRef) {
      throw new Error("Invalid reference for PDF generation");
    }

    // Helper function to paginate the data
    const paginateData = (data: any[], itemsPerPage: number) => {
      const pages: any[][] = [];
      for (let i = 0; i < data.length; i += itemsPerPage) {
        pages.push(data.slice(i, i + itemsPerPage));
      }
      return pages;
    };

    // Number of entries per page
    const itemsPerPage = 30; // Adjust this number as needed

    const template = templateData;
    const font = await getFontsData();

    try {
      const pages = paginateData(inputs, itemsPerPage);
      const pdfBuffers: Uint8Array[] = [];

      for (const pageData of pages) {
        const pdf = await generate({
          template,
          inputs: pageData,
          plugins: getPlugins(),
        });

        pdfBuffers.push(new Uint8Array(pdf.buffer));
      }

      // Combine all Uint8Arrays into one
      const combinedPdfBuffer = new Uint8Array(
        pdfBuffers.reduce((acc, buf) => acc.concat(Array.from(buf)), [])
      );

      const blob = new Blob([combinedPdfBuffer], { type: "application/pdf" });
      window.open(URL.createObjectURL(blob));
    } catch (error) {
      console.error("Error generating PDF:", error);
      throw new Error("Failed to generate PDF");
    }
  }

  return (
    <div>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          margin: "0 1rem",
          fontSize: "small",
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
          borderColor: "#27272a",
        }}
        className="flex mb-3 justify-center"
      >
        <Button
          style={{
            backgroundColor: "var(--background)",
            color: "var(--foreground)",
            borderColor: "#27272a",
          }}
          className="mx-2 mt-3 border mb-3"
          onClick={() => {
            GeneratePDFWInputs(inputs, templateData);
          }}
        >
          Generate PDF w inputs
        </Button>
      </header>
      <div
        ref={designerRef}
        style={{ width: "100%", height: `calc(100vh - ${headerHeight}px)` }}
      />
    </div>
  );
}




