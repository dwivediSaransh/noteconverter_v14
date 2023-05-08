export interface FileFormat {
    name : string;
    title : string;
    icon: string;
    options : FileFormatOption[];
    subFeatures?: FileFormatSubFeature[];
}

export interface FileFormatOption {
    value: string;
    title: string;
    icon?: string;
    isDefault?: boolean;
    glyph? : string;
}

export interface FileFormatSubFeature{
name: string;
title: string;
enabledIf: string;
type: string;
options: FileFeatureSubFeatureOption[];
}

export interface FileFeatureSubFeatureOption {
    value: boolean;
    isDefault?: boolean;
}

export interface ScanFeatureOption {
    value: string;
    title: string;
    icon?: string;
    glyph?: string;
    isDefault?: boolean;
}

export interface ScanFeature {
    name: string;
    title: string;
    icon: string;
    options: ScanFeatureOption[];
}
  
export class Common {

    public static global_email:string;
    public static global_Generation:string;
    public static global_IsThirdGenBrowser:string;
    public static global_isVersaLink:string;
    public static global_isAltaLink:string;
    public static global_isEighthGen:string;
    public static global_Model:string
}