import type { DataRoomFolder, DataRoomFile } from "./dataroom-types";

function file(
  id: string,
  name: string,
  type: "file" | "link",
  opts: Partial<DataRoomFile> = {}
): DataRoomFile {
  return {
    id,
    name,
    type,
    modified: "Yesterday at 5:53 PM",
    modifiedBy: "Mae Ariale",
    sharing: "Shared",
    size: type === "link" ? "—" : "1.2 MB",
    ...opts,
  };
}

function folder(
  id: string,
  name: string,
  slug: string,
  children: DataRoomFolder["children"],
  opts: Partial<DataRoomFolder> = {}
): DataRoomFolder {
  return {
    id,
    name,
    slug,
    modified: "Yesterday at 5:53 PM",
    modifiedBy: "Mae Ariale",
    sharing: "Shared",
    children,
    ...opts,
  };
}

/** Build initial tree matching current static structure (all items treated as real, editable) */
export function getInitialDataRoomState(): DataRoomFolder[] {
  return [
    folder("company-profile", "Company Profile", "company-profile", [
      file("cp-1", "Long Version (PDF)", "file", { description: "Full Company Profile", size: "18.9 MB" }),
      file("cp-2", "Deck (Presentation)", "file", { description: "Canva/PDF presentation", size: "12.5 MB" }),
      file("cp-3", "Short One-Pager (PDF)", "file", { description: "Summary version", size: "3.2 MB" }),
      file("cp-4", "Videos", "file", { description: "Company Overview, Highlights", size: "45.7 MB" }),
      file("cp-5", "Proposal (Staff Augmentation)", "file", { description: "PDF proposal", size: "8.1 MB" }),
    ], { icon: "🏢", description: "Company information and overview" }),
    folder("catalog", "Catalog", "catalog", [
      file("cat-1", "Product Link", "link", { description: "Direct link to product/service info" }),
      file("cat-2", "Presentation Deck", "file", { description: "Product presentation", size: "15.3 MB" }),
      file("cat-3", "Product Videos", "file", { description: "Product demos", size: "67.2 MB" }),
    ], { icon: "📚", description: "Product and service catalog" }),
    folder("specific-industry", "Specific Industry", "specific-industry", [
      folder("private-sector", "Private Sector", "private-sector", [
        folder("education", "Education", "education", [
          file("edu-1", "Catalog Link", "link", { description: "Direct product links" }),
          file("edu-2", "Presentation Deck", "file", { description: "Education-specific deck", size: "14.2 MB" }),
          file("edu-3", "Video Resources", "file", { description: "Educational demos", size: "52.1 MB" }),
          folder("edu-prop", "Proposals", "proposals", [], { description: "Education-specific proposals" }),
        ], { icon: "🎓" }),
        folder("telecommunications", "Telecommunications", "telecommunications", [
          file("tel-1", "Catalog Link", "link", {}),
          file("tel-2", "Presentation Deck", "file", { size: "16.8 MB" }),
          file("tel-3", "Video Resources", "file", { size: "48.3 MB" }),
          folder("tel-prop", "Proposals", "proposals", []),
        ], { icon: "📡" }),
        folder("other-industries", "Other Industries", "other-industries", [
          file("oth-1", "Catalog Link", "link", {}),
          file("oth-2", "Presentation Deck", "file", { size: "13.5 MB" }),
          file("oth-3", "Video Resources", "file", { size: "39.7 MB" }),
          folder("oth-prop", "Proposals", "proposals", []),
        ], { icon: "🏭" }),
      ], { icon: "🏢" }),
      folder("lgu", "LGU", "lgu", [
        folder("government-agencies", "Government Agencies", "government-agencies", [
          file("gov-1", "Catalog Link", "link", {}),
          file("gov-2", "Presentation Deck", "file", { size: "17.3 MB" }),
          file("gov-3", "Video Resources", "file", { size: "61.8 MB" }),
          folder("gov-prop", "Proposals", "proposals", []),
        ], { icon: "🏛️" }),
        folder("education-lgu", "Education (LGU)", "education-lgu", [
          file("edulgu-1", "Catalog Link", "link", {}),
          file("edulgu-2", "Presentation Deck", "file", { size: "15.1 MB" }),
          file("edulgu-3", "Video Resources", "file", { size: "54.9 MB" }),
          folder("edulgu-prop", "Proposals", "proposals", []),
        ], { icon: "🎓" }),
        folder("other-lgu", "Other LGU Sectors", "other-lgu", [
          file("olgu-1", "Catalog Link", "link", {}),
          file("olgu-2", "Presentation Deck", "file", { size: "12.8 MB" }),
          file("olgu-3", "Video Resources", "file", { size: "41.2 MB" }),
          folder("olgu-prop", "Proposals", "proposals", []),
        ], { icon: "🏢" }),
      ], { icon: "🏛️" }),
    ], { icon: "🏭", description: "Industry-specific documents" }),
    folder("contact-us", "Contact Us", "contact-us", [
      file("cu-1", "Data Room Admin Info", "file", { description: "HSI Contact Information", size: "1.2 MB" }),
    ], { icon: "📧", description: "Contact information and support" }),
  ];
}
