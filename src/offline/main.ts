import { provideZonelessChangeDetection } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { registerServiceWorker } from "../sw-register";
import { OfflineComponent } from "./offline.component";

bootstrapApplication(OfflineComponent, {
	providers: [provideZonelessChangeDetection()],
}).catch((err) => console.error("Bootstrap error:", err));

registerServiceWorker();
