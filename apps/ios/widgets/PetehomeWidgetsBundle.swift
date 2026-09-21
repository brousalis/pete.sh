//
//  petehomeWidgetsBundle.swift
//  petehomeWidgets
//
//  Created by Pete Brousalis on 1/5/26.
//

import WidgetKit
import SwiftUI

@main
struct PetehomeWidgetsBundle: WidgetBundle {
    var body: some Widget {
        // Watch face complication showing workout progress
        PetehomeComplication()
    }
}
