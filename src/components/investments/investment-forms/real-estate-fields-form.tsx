import React from "react";
import { RealEstateForm } from "../real-estate/real-estate-form";

export interface RenderRealEstateFieldsProps {
  control: any;
}

const RenderRealEstateFieldsComponent: React.FC<RenderRealEstateFieldsProps> = ({ control }) => {
  return <RealEstateForm control={control} />;
};

export const MemoizedRenderRealEstateFields = React.memo(RenderRealEstateFieldsComponent);
