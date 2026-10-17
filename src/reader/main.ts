import { provideZonelessChangeDetection } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { registerServiceWorker } from "../sw-register";
import { ReaderComponent } from "./reader.component";

bootstrapApplication(ReaderComponent, {
	providers: [provideZonelessChangeDetection()],
}).catch((err) => console.error("Bootstrap error:", err));

registerServiceWorker();
