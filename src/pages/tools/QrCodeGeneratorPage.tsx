import { useState, useRef, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, QrCode } from "lucide-react";
import QRCode from "qrcode";

const TYPES = [
  { value: "url", label: "URL" },
  { value: "text", label: "Text" },
  { value: "wifi", label: "WiFi" },
  { value: "vcard", label: "vCard" },
];

const QrCodeGeneratorPage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [type, setType] = useState("url");
  const [text, setText] = useState("https://example.com");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPass, setWifiPass] = useState("");
  const [wifiEnc, setWifiEnc] = useState("WPA");
  const [vcName, setVcName] = useState("");
  const [vcPhone, setVcPhone] = useState("");
  const [vcEmail, setVcEmail] = useState("");
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [generated, setGenerated] = useState(false);

  const getData = () => {
    if (type === "wifi") return `WIFI:T:${wifiEnc};S:${wifiSsid};P:${wifiPass};;`;
    if (type === "vcard") return `BEGIN:VCARD\nVERSION:3.0\nFN:${vcName}\nTEL:${vcPhone}\nEMAIL:${vcEmail}\nEND:VCARD`;
    return text;
  };

  const generate = async () => {
    if (!canvasRef.current) return;
    try {
      await QRCode.toCanvas(canvasRef.current, getData(), {
        width: 400,
        margin: 2,
        color: { dark: fgColor, light: bgColor },
      });
      setGenerated(true);
    } catch (e) {
      console.error(e);
    }
  };

  const download = () => {
    if (!canvasRef.current) return;
    const a = document.createElement("a");
    a.download = "qrcode.png";
    a.href = canvasRef.current.toDataURL("image/png");
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-xl mx-auto px-4 py-8 space-y-5">
        <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2"><QrCode className="h-5 w-5 text-primary" /> QR Code Generator</h2>
        <div className="space-y-3">
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {type === "url" && <div><Label>URL</Label><Input value={text} onChange={e => setText(e.target.value)} placeholder="https://..." /></div>}
          {type === "text" && <div><Label>Text</Label><Input value={text} onChange={e => setText(e.target.value)} placeholder="Your text" /></div>}
          {type === "wifi" && (
            <div className="space-y-2">
              <div><Label>SSID</Label><Input value={wifiSsid} onChange={e => setWifiSsid(e.target.value)} /></div>
              <div><Label>Password</Label><Input value={wifiPass} onChange={e => setWifiPass(e.target.value)} /></div>
              <div><Label>Encryption</Label>
                <Select value={wifiEnc} onValueChange={setWifiEnc}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="WPA">WPA/WPA2</SelectItem><SelectItem value="WEP">WEP</SelectItem><SelectItem value="nopass">None</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          )}
          {type === "vcard" && (
            <div className="space-y-2">
              <div><Label>Name</Label><Input value={vcName} onChange={e => setVcName(e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={vcPhone} onChange={e => setVcPhone(e.target.value)} /></div>
              <div><Label>Email</Label><Input value={vcEmail} onChange={e => setVcEmail(e.target.value)} /></div>
            </div>
          )}
          <div className="flex gap-3">
            <div><Label>Foreground</Label><input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)} className="h-9 w-14 rounded border border-border cursor-pointer" /></div>
            <div><Label>Background</Label><input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="h-9 w-14 rounded border border-border cursor-pointer" /></div>
          </div>
          <Button onClick={generate} className="w-full">Generate QR Code</Button>
        </div>
        <div className="flex flex-col items-center gap-3">
          <canvas ref={canvasRef} className="rounded-lg border border-border" />
          {generated && <Button variant="outline" onClick={download}><Download className="h-4 w-4 mr-1" />Download PNG</Button>}
        </div>
      </main>
    </div>
  );
};

export default QrCodeGeneratorPage;
