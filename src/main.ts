import { provideZonelessChangeDetection } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { registerServiceWorker } from "./sw-register";

bootstrapApplication(AppComponent, {
	providers: [provideZonelessChangeDetection()],
}).catch((err) => console.error("Bootstrap error:", err));

registerServiceWorker();
