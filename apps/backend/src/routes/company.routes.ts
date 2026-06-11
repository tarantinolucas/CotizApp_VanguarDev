import { Router } from "express";
import {
  createCompanyHandler,
  deactivateCompanyHandler,
  getCompanyHandler,
  listCompaniesHandler,
  updateCompanyHandler
} from "../controllers/company.controller.js";

export const companyRouter = Router();

companyRouter.get("/", listCompaniesHandler);
companyRouter.get("/:id", getCompanyHandler);
companyRouter.post("/", createCompanyHandler);
companyRouter.put("/:id", updateCompanyHandler);
companyRouter.patch("/:id/deactivate", deactivateCompanyHandler);
