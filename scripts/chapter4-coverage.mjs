import fs from "node:fs";
import { sections } from "../assets/js/chapter4/activities.mjs";
const bank = JSON.parse(
  fs.readFileSync(new URL("../assets/js/chapter4/bank.json", import.meta.url)),
);
const checks = JSON.parse(
  fs.readFileSync(
    new URL("../tests/fixtures/chapter4-bank.json", import.meta.url),
  ),
);
const clean = (s) => String(s).replaceAll("|", "\\|").replaceAll("\n", " ");
const pages={'4.1':75,'4.2':76,'4.3':78,'4.4':80,'4.5':84,'4.6':86,'4.7':89,'4.8':91,'4.9':92,'4.10':93,'4.11':99,'4.11.1':99,'4.11.2':99,'4.11.3':100,'4.12':107,'4.13':109,'4.14':115,'4.14.1':115,'4.14.2':115,'4.14.3':118,'4.15':119,'4.16':121};
const tasks = {
  data: "ویرایش داده، میانگین/میانه، دو تعریف واریانس و هیستوگرام",
  normal: "ناحیهٔ احتمال، تبدیل z، جدول و بازده",
  sampling: "اجرای تکرارشونده، بایاس، همبستگی و SD/SEM",
  single: "تصحیح، خواندن منفرد، میانگین و پیش‌بینی",
  chi: "چگالی و دُم‌ها، فاصلهٔ واریانس و SD",
  fit: "هیستوگرام، QQ و آزمون گروهی با کنترل اعتبار",
  outlier: "مرجع مستقل، حفظ اصل داده و دلیل مقایسهٔ حذف",
  student: "t در برابر z با پوشش یکسان و دو قرارداد دُم",
  prop: "حساسیت، تصحیح، حدود، u و کوواریانس، مدل چندمتغیره",
  summary: "انتخاب روش بر مبنای سؤال و داده",
  bank: "۸۲ ارجاع، راهنمای مرحله‌ای و حل ممیزی‌شده",
  pressure: "شواهد آماری، تصمیم و اعتبارسنجی مستقل",
  ai: "سه نقد اختیاری آفلاین با شواهد و بازبینی مدرس",
};
let out =
  "# ماتریس پوشش فصل ۴\n\nهر ردیف مثال/مسئله یک شناسهٔ مستقل دارد. ارجاع صفحه، صفحهٔ چاپی است. محاسبات «مشروط/اقتـباسی» فقط تحت فرض آشکار بانک معتبرند. هیچ ردیف مفهومی پاسخ عددی ساختگی ندارد.\n\n## بخش‌ها و زیربخش‌ها\n\n| شماره | صفحهٔ آغاز | عنوان | فعالیت قابل اجرا | مسیر |\n|---|---|---|---|---|\n";
for (const [id, title, kind] of sections)
  out += `| ${id} | ${pages[id]??"تلفیقی"} | ${title} | ${tasks[kind]} | [باز کردن](../../chapters/chapter-04/index.html#${id}) |\n`;
out +=
  "\n## ۲۲ مثال و ۶۰ مسئله\n\nبرای هر مورد دادهٔ اصلی/فرض اقتباسی، توضیح مستقل، دو راهنما و حل در بانک قابل باز کردن‌اند. همهٔ نتایج عددی با fixture مستقل مقایسه شده‌اند. آزمون مفهومی ۴٫۱۱ بازبینی توضیح دارد.\n\n| شناسه | عنوان مستقل | صفحه | بخش | نوع حل | وضعیت | یادداشت منبع |\n|---|---|---|---|---|---|---|---|\n";
for (const e of bank) {
  if (!(e.id in checks)) throw new Error("Missing independent audit " + e.id);
  out += `| ${e.id} | ${clean(e.title)} | ${e.page} | ${e.section} | ${e.type} | ${clean(e.status)} | ${clean(e.note || "دادهٔ تعریف‌شده؛ بررسی مستقل عددی")} |\n`;
}
fs.writeFileSync(
  new URL("../docs/chapter-04/coverage.md", import.meta.url),
  out,
);
