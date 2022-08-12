import { Page } from "puppeteer-core";
import { logger } from "../tools/logger";

export const removeConsent = async (page: Page) => {
  const start = Date.now();
  await page.evaluate(
    (rules: string[]) => {
      console.info("Rules", rules.length);
      rules.forEach(rule => {
        try {
          console.info("Rule", rule);

          const elements = document.querySelectorAll(rule);
          console.info("All elements", elements.length);
          Array.from(elements).forEach(e => {
            (e as HTMLElement).style.border = "5px solid black";
            if ((e as HTMLButtonElement).click) {
              try {
                console.info("Clicking", rule);
                (e as HTMLButtonElement).click();
                console.info("After clicking", document.readyState);
              } catch (err) {
                console.info("Error clicking", rule, err);
              }
            }
          });

          document.querySelectorAll("iframe").forEach(iframe => {
            const elements = iframe.contentWindow?.document.body.querySelectorAll(rule);
            console.info("All elements", elements?.length);
            Array.from(elements || []).forEach(e => {
              (e as HTMLElement).style.border = "5px solid black";
              if ((e as HTMLButtonElement).click) {
                try {
                  console.info("Clicking", rule);
                  (e as HTMLButtonElement).click();
                  console.info("After clicking", iframe.contentWindow?.document.readyState);
                } catch (err) {
                  console.info("Error clicking", rule, err);
                }
              }
            });
            iframe.parentNode?.removeChild(iframe);
          });
        } catch (err) {
          console.info("Error running rule", rule, err);
        }
      });
    },
    [
      "button[name=agree]",
      "button[title~=OK]",
      "button[title~=Yes]",
      "button[name=accept-all-consents]",
      ".ytd-button-renderer[aria-label~=Reject]",
      "button[id=L2AGLb]",
      "#notice button",
      "button[data-testid=GDPR-accept]",
      "button[aria-label~=collapse]"
    ]
  );

  logger.info("Removed consents in", Date.now() - start, "ms");

  try {
    await page.waitForNavigation({
      timeout: 3000
    });
  } catch (err) {
    logger.warn("Timeout waiting for navigation after consent");
  }
};
