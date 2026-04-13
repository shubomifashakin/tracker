import * as h3 from 'h3-js';
import { Injectable } from '@nestjs/common';

import { FnResult } from '../../types/common.types';
import { makeError } from '../../common/fns';

@Injectable()
export class H3Service {
  constructor() {}

  latLngToCell(
    lat: number,
    lng: number,
    resolution: number = 9,
  ): FnResult<string> {
    try {
      const data = h3.latLngToCell(lat, lng, resolution);
      return { success: true, data, error: null };
    } catch (error) {
      return { success: false, error: makeError(error), data: null };
    }
  }

  isValidCell(cell: string): FnResult<boolean> {
    try {
      const data = h3.isValidCell(cell);
      return { success: true, data, error: null };
    } catch (error) {
      return { success: false, error: makeError(error), data: null };
    }
  }

  cellToLatLng(cell: string): FnResult<h3.CoordPair> {
    try {
      const data = h3.cellToLatLng(cell);
      return { success: true, data, error: null };
    } catch (error) {
      return { success: false, error: makeError(error), data: null };
    }
  }
}
